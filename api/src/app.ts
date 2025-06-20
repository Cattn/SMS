import express from 'express';
import itemRoutes from './routes/index';
import { errorHandler } from './middleware/errorHandker';
import fileUpload from 'express-fileupload';

const app = express();

app.use(express.json());
app.use(fileUpload());

app.use('/api/', itemRoutes);
app.use(errorHandler);

export default app;