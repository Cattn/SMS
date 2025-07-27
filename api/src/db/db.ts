import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

class Database {
	private db: sqlite3.Database;
	private initPromise: Promise<void>;

	constructor(dbPath: string = './data/sms.db') {
		const dbDir = path.dirname(dbPath);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}
		
		this.db = new sqlite3.Database(dbPath);
		this.initPromise = this.initTables();
	}

	private async initTables(): Promise<void> {
		const schemaSQL = `
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                parent_path TEXT DEFAULT '',
                is_excluded BOOLEAN DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                UNIQUE(relative_path)
            );

            CREATE TABLE IF NOT EXISTS scheduled_deletions (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                relative_path TEXT DEFAULT '',
                scheduled_at INTEGER NOT NULL,
                status TEXT CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED')) DEFAULT 'PENDING',
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                UNIQUE(file_path)
            );

            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                size INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                UNIQUE(relative_path)
            );

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#6366f1',
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
            );

            CREATE TABLE IF NOT EXISTS file_tags (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(file_id, tag_id)
            );

            CREATE TABLE IF NOT EXISTS folder_tags (
                id TEXT PRIMARY KEY,
                folder_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(folder_id, tag_id)
            );

            CREATE INDEX IF NOT EXISTS idx_scheduled_at ON scheduled_deletions(scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_status ON scheduled_deletions(status);
            CREATE INDEX IF NOT EXISTS idx_filename ON scheduled_deletions(filename);
            CREATE INDEX IF NOT EXISTS idx_relative_path ON scheduled_deletions(relative_path);
            
            CREATE INDEX IF NOT EXISTS idx_folder_path ON folders(relative_path);
            CREATE INDEX IF NOT EXISTS idx_folder_parent ON folders(parent_path);
            CREATE INDEX IF NOT EXISTS idx_folder_excluded ON folders(is_excluded);

            CREATE INDEX IF NOT EXISTS idx_files_path ON files(relative_path);
            CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
            
            CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
            
            CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
            CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
            
            CREATE INDEX IF NOT EXISTS idx_folder_tags_folder ON folder_tags(folder_id);
            CREATE INDEX IF NOT EXISTS idx_folder_tags_tag ON folder_tags(tag_id);
        `;

		return new Promise<void>((resolve, reject) => {
			this.db.exec(schemaSQL, (err) => {
				if (err) {
					console.error('Database initialization error:', err);
					reject(err);
				} else {
					console.log('Database tables initialized successfully');
					resolve();
				}
			});
		});
	}

	async ensureInitialized(): Promise<void> {
		return this.initPromise;
	}

	async run(
		sql: string,
		params: (string | number | boolean | null)[] = []
	): Promise<sqlite3.RunResult> {
		await this.ensureInitialized();
		return new Promise((resolve, reject) => {
			this.db.run(sql, params, function (err) {
				if (err) reject(err);
				else resolve(this);
			});
		});
	}

	async get<T = unknown>(
		sql: string,
		params: (string | number | boolean | null)[] = []
	): Promise<T | undefined> {
		await this.ensureInitialized();
		return new Promise((resolve, reject) => {
			this.db.get(sql, params, (err, row) => {
				if (err) reject(err);
				else resolve(row as T);
			});
		});
	}

	async all<T = unknown>(
		sql: string,
		params: (string | number | boolean | null)[] = []
	): Promise<T[]> {
		await this.ensureInitialized();
		return new Promise((resolve, reject) => {
			this.db.all(sql, params, (err, rows) => {
				if (err) reject(err);
				else resolve((rows || []) as T[]);
			});
		});
	}
}

export const db = new Database();
