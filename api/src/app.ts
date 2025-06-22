import express from 'express';
import itemRoutes from './routes/index';
import { errorHandler } from './middleware/errorHandker';
import { db } from './db/db';

const app = express();

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization'
	);
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
	} else {
		next();
	}
});

app.use(express.json());

app.use(
	'/api/',
	async (req, res, next) => {
		try {
			await db.ensureInitialized();
			next();
		} catch (error) {
			console.error('Database not ready:', error);
			res.status(503).json({ error: 'Database not ready. Please try again later.' });
		}
	},
	itemRoutes
);

app.use(errorHandler);

export default app;
