import app from './app';
import { DeletionManager } from './services/timer';

const PORT = 5823;

DeletionManager.restoreTimersOnStartup();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});