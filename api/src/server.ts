import app from './app';
import { DeletionManager } from './services/timer';
import fs from 'fs';
import path from 'path';

const PORT = 5823;

const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(process.cwd(), '../uploads');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

DeletionManager.restoreTimersOnStartup();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});