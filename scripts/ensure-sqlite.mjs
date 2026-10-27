import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function checkBinding() {
	return spawnSync(process.execPath, ['-e', "require('sqlite3')"], {
		cwd: root,
		encoding: 'utf8'
	});
}

function repair() {
	const initialCheck = checkBinding();
	if (initialCheck.status === 0 && !process.argv.includes('--rebuild')) return;

	if (initialCheck.status !== 0) {
		console.error(initialCheck.stderr || initialCheck.error?.message);
	}
	console.log('Building SQLite from source for this system...');

	const npmCli = process.env.npm_execpath;
	if (!npmCli) {
		console.error('Run this repair through npm: npm run repair:sqlite');
		process.exitCode = 1;
		return;
	}

	const result = spawnSync(
		process.execPath,
		[npmCli, 'rebuild', 'sqlite3', '--foreground-scripts'],
		{
			cwd: root,
			stdio: 'inherit',
			env: { ...process.env, npm_config_build_from_source: 'true' }
		}
	);
	if (result.status !== 0) {
		console.error(result.error?.message || 'SQLite could not be built from source.');
		console.error(
			'Install Python, make, and a C++ compiler, then run npm run repair:sqlite. ' +
				'On Debian/Ubuntu: sudo apt install build-essential python3'
		);
		process.exitCode = result.status || 1;
		return;
	}

	// Check in a fresh process so a failed native load cannot remain cached.
	const finalCheck = checkBinding();
	if (finalCheck.status !== 0) {
		console.error(finalCheck.stderr || finalCheck.error?.message);
		console.error(
			'SQLite still cannot load. Check the build output before starting the API server.'
		);
		process.exitCode = 1;
		return;
	}
	console.log('SQLite is ready.');
}

repair();
