import retimer from 'retimer';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../db/db';

interface RetimerInstance {
    clear(): void;
    reschedule(timeout: number): void;
}

interface ScheduledDeletion {
    filename: string;
    scheduled_at: number;
    status: string;
    created_at: number;
}

class ScheduledDeletionManager {
    private timers: Map<string, RetimerInstance> = new Map();

    constructor() {

    }

    async scheduleFileDeletion(filename: string, filePath: string, expiresAt: Date): Promise<string> {
        const id = crypto.randomUUID();
        const scheduledAtMs = expiresAt.getTime();
        
        try {
            await db.run(
                'REPLACE INTO scheduled_deletions (id, filename, file_path, scheduled_at) VALUES (?, ?, ?, ?)',
                [id, filename, filePath, scheduledAtMs]
            );

            const delay = scheduledAtMs - Date.now();
            if (delay > 0) {
                const timer = retimer(async () => {
                    await this.executeFileDeletion(id, filename, filePath);
                }, delay);
                this.timers.set(id, timer);
            } else {
                await this.executeFileDeletion(id, filename, filePath);
            }

            console.log(`Scheduled deletion for ${filename} at ${expiresAt.toISOString()}`);
            return id;
        } catch (error) {
            console.error(`Failed to schedule deletion for ${filename}:`, error);
            throw error;
        }
    }

    async cancelFileDeletion(filename: string): Promise<boolean> {
        try {
            const row = await db.get<{id: string}>(
                'SELECT id FROM scheduled_deletions WHERE filename = ? AND status = "PENDING"',
                [filename]
            );

            if (row) {
                const timer = this.timers.get(row.id);
                if (timer) {
                    timer.clear();
                    this.timers.delete(row.id);
                }
                
                await db.run(
                    'UPDATE scheduled_deletions SET status = "CANCELLED" WHERE id = ?',
                    [row.id]
                );
                
                console.log(`Cancelled scheduled deletion for ${filename}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Failed to cancel deletion for ${filename}:`, error);
            return false;
        }
    }

    private async executeFileDeletion(id: string, filename: string, filePath: string) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                await db.run(
                    'UPDATE scheduled_deletions SET status = "COMPLETED" WHERE id = ?',
                    [id]
                );
                console.log(`✓ Scheduled deletion completed: ${filename}`);
            } else {
                await db.run(
                    'UPDATE scheduled_deletions SET status = "COMPLETED" WHERE id = ?',
                    [id]
                );
                console.log(`ℹ File already deleted: ${filename}`);
            }
        } catch (error) {
            await db.run(
                'UPDATE scheduled_deletions SET status = "FAILED" WHERE id = ?',
                [id]
            );
            console.error(`✗ Failed to delete file ${filename}:`, error);
        }
    }

    async restoreTimersOnStartup() {
        try {
            const rows = await db.all<{id: string, filename: string, file_path: string, scheduled_at: number}>(
                'SELECT id, filename, file_path, scheduled_at FROM scheduled_deletions WHERE status = "PENDING"'
            );

            console.log(`Restoring ${rows.length} scheduled deletions...`);

            for (const row of rows) {
                const scheduledAt = new Date(row.scheduled_at);
                const now = new Date();
                
                if (scheduledAt <= now) {
                    console.log(`Executing overdue deletion: ${row.filename}`);
                    await this.executeFileDeletion(row.id, row.filename, row.file_path);
                } else {
                    const delay = scheduledAt.getTime() - now.getTime();
                    const timer = retimer(async () => {
                        await this.executeFileDeletion(row.id, row.filename, row.file_path);
                    }, delay);
                    this.timers.set(row.id, timer);
                    
                    console.log(`Restored timer for ${row.filename} (${Math.round(delay/1000/60)} minutes remaining)`);
                }
            }
        } catch (error) {
            console.error('Failed to restore timers:', error);
        }
    }

    async getScheduledDeletions(): Promise<ScheduledDeletion[]> {
        return db.all<ScheduledDeletion>(
            'SELECT filename, scheduled_at, status, created_at FROM scheduled_deletions ORDER BY scheduled_at ASC'
        );
    }

    async cleanupOldRecords(olderThanDays: number = 30) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        const result = await db.run(
            'DELETE FROM scheduled_deletions WHERE status IN ("COMPLETED", "FAILED", "CANCELLED") AND created_at < ?',
            [cutoffTime]
        );
        console.log(`Cleaned up ${result.changes} old deletion records`);
    }
}

export const DeletionManager = new ScheduledDeletionManager();