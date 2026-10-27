import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const brokenBinding = `throw Object.assign(new Error("libm.so.6: version GLIBC_2.38 not found"), {
	code: 'ERR_DLOPEN_FAILED'
});`;

function fixture(t, { binding = brokenBinding, build = 'success' } = {}) {
	const root = mkdtempSync(path.join(tmpdir(), 'sms-sqlite-'));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(path.join(root, 'scripts'));
	mkdirSync(path.join(root, 'node_modules/sqlite3'), { recursive: true });
	copyFileSync(
		new URL('../scripts/ensure-sqlite.mjs', import.meta.url),
		path.join(root, 'scripts/ensure-sqlite.mjs')
	);
	writeFileSync(
		path.join(root, 'package.json'),
		JSON.stringify({ name: 'sms-fixture', version: '1.0.0' })
	);
	writeFileSync(
		path.join(root, 'node_modules/sqlite3/package.json'),
		JSON.stringify({
			name: 'sqlite3',
			version: '6.0.1',
			main: 'index.cjs',
			scripts: { install: 'node install.cjs' }
		})
	);
	writeFileSync(path.join(root, 'node_modules/sqlite3/index.cjs'), binding);
	writeFileSync(
		path.join(root, 'node_modules/sqlite3/install.cjs'),
		`const fs = require('node:fs');
		fs.writeFileSync('rebuild.json', JSON.stringify({ fromSource: process.env.npm_config_build_from_source }));
		if (${JSON.stringify(build)} === 'failure') process.exit(17);
		if (${JSON.stringify(build)} === 'success') fs.writeFileSync('index.cjs', 'module.exports = {};');`
	);
	return {
		run(args = []) {
			assert.ok(process.env.npm_execpath, 'Run these tests with npm run test:sqlite');
			return spawnSync(process.execPath, [path.join(root, 'scripts/ensure-sqlite.mjs'), ...args], {
				cwd: root,
				encoding: 'utf8',
				env: {
					...process.env,
					npm_config_cache: path.join(root, 'npm-cache'),
					npm_config_offline: 'true'
				}
			});
		},
		rebuild() {
			return JSON.parse(readFileSync(path.join(root, 'node_modules/sqlite3/rebuild.json'), 'utf8'));
		}
	};
}

test('leaves a working binding alone', (t) => {
	const sqlite = fixture(t, { binding: 'module.exports = {};', build: 'failure' });
	const result = sqlite.run();
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, '');
	assert.throws(() => sqlite.rebuild(), { code: 'ENOENT' });
});

test('repairs a glibc-incompatible binding through npm using a source build', (t) => {
	const sqlite = fixture(t);
	const result = sqlite.run();
	assert.equal(result.status, 0, result.stderr);
	assert.equal(sqlite.rebuild().fromSource, 'true');
	assert.match(result.stdout, /SQLite is ready/);
});

test('fails installation with repair instructions when the source build fails', (t) => {
	const sqlite = fixture(t, { build: 'failure' });
	const result = sqlite.run();
	assert.notEqual(result.status, 0);
	assert.equal(sqlite.rebuild().fromSource, 'true');
	assert.match(result.stderr, /sudo apt install build-essential python3/);
	assert.match(result.stderr, /npm run repair:sqlite/);
});

test('rejects a successful rebuild if the binding still cannot load', (t) => {
	const sqlite = fixture(t, { build: 'still-broken' });
	const result = sqlite.run();
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /SQLite still cannot load/);
});

test('the explicit repair command rebuilds even a loadable binding', (t) => {
	const sqlite = fixture(t, { binding: 'module.exports = {};' });
	const result = sqlite.run(['--rebuild']);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(sqlite.rebuild().fromSource, 'true');
});
