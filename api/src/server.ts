import app from './app';
import { DeletionManager } from './services/timer';
import { db } from './db/db';
import { scanAndSyncFolders } from './handlers/fs';
import { readConfig } from './handlers/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';

const PORT = 5823;
const FILE_SERVING_PORT = 3000;

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

		console.log('Scanning and syncing existing folders...');
		await scanAndSyncFolders();

		console.log('Restoring scheduled deletion timers...');
		await DeletionManager.restoreTimersOnStartup();

		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});

		const config = readConfig();
		if (config.server.fileServingEnabled) {
			startFileServingServer(uploadsDir);
		}
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

function startFileServingServer(uploadsDir: string) {
	const fileApp = express();
	const fileServer = http.createServer(fileApp);

	if (fs.existsSync(uploadsDir)) {
		fileApp.use('/SMS/uploads', express.static(uploadsDir));
		
		fileApp.use('/SMS/upload', (req, res) => {
			res.status(404).send('404, did you mean `/SMS/uploads`?');
		});
	}

	fileServer.listen(FILE_SERVING_PORT, () => {
		console.log(`File serving enabled on port ${FILE_SERVING_PORT}`);
	});
}

startServer();
