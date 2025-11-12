import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './db/connection.js';
import carRouter from './routers/carRouter.js';
import ragRouter from './routers/ragRoute.js';
import { watchCarChanges } from './listeners/vectorSync.js';
import mongoPool from './utils/mongoPool.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ message: 'RAG Backend — running' }));

// API routes
app.use('/api/v1', carRouter);
app.use('/api/v1/rag', ragRouter);

const PORT = process.env.PORT || 3000;

// Attempt DB connect (if MONGO_URI provided). Start server regardless so this is easy to run.
connectDB()
  .then(() => {
    console.log('DB init attempted');
    watchCarChanges();
  })
  .catch(err => console.warn('DB init error:', err))
  .finally(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await mongoPool.closePool();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  try {
    await mongoPool.closePool();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
