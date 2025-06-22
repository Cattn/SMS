import sqlite3 from 'sqlite3';

class Database {
    private db: sqlite3.Database;

    constructor(dbPath: string = './data/sms.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initTables();
    }

    private async initTables() {
        const schemaSQL = `
            CREATE TABLE IF NOT EXISTS scheduled_deletions (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                scheduled_at INTEGER NOT NULL,
                status TEXT CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED')) DEFAULT 'PENDING',
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                UNIQUE(filename)
            );
            CREATE INDEX IF NOT EXISTS idx_scheduled_at ON scheduled_deletions(scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_status ON scheduled_deletions(status);
            CREATE INDEX IF NOT EXISTS idx_filename ON scheduled_deletions(filename);
        `;
        
        return new Promise<void>((resolve, reject) => {
            this.db.exec(schemaSQL, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async run(sql: string, params: (string | number | boolean | null)[] = []): Promise<sqlite3.RunResult> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    async get<T = unknown>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row as T);
            });
        });
    }

    async all<T = unknown>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve((rows || []) as T[]);
            });
        });
    }
}

export const db = new Database();