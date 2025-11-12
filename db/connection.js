import mongoose from 'mongoose';

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('MONGO_URI not set; skipping MongoDB connection');
    return;
  }

  try {
    // Mongoose modern versions infer options; keep minimal config
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

export default connectDB;
