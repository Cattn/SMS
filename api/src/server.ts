import app from './app';
import { DeletionManager } from './services/timer';
import { db } from './db/db';
import fs from 'fs';
import path from 'path';

const PORT = 5823;

async function startServer() {
    try {
        const dataDir = path.join(__dirname, '../data');
        const uploadsDir = path.join(process.cwd(), '../uploads');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        console.log('Initializing database...');
        await db.ensureInitialized();

        console.log('Restoring scheduled deletion timers...');
        await DeletionManager.restoreTimersOnStartup();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();