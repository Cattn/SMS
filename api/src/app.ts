import express from 'express';
import itemRoutes from './routes/index';
import { errorHandler } from './middleware/errorHandker';

const app = express();

app.use(express.json());

app.use('/api/', itemRoutes);
app.use(errorHandler);

export default app;