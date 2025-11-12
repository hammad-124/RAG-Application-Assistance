// utils/mongoPool.js
import { MongoClient } from "mongodb";

class MongoPool {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async getClient() {
    if (!this.client || !this.isConnected) {
      this.client = new MongoClient(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        maxIdleTimeMS: 30000,
        minPoolSize: 2
      });
      
      try {
        await this.client.connect();
        this.isConnected = true;
        console.log("📦 MongoDB connection pool initialized");
      } catch (error) {
        console.error("Failed to connect to MongoDB pool:", error);
        throw error;
      }
    }
    
    return this.client;
  }

  async closePool() {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log("📦 MongoDB connection pool closed");
    }
  }
}

// Singleton instance
const mongoPool = new MongoPool();
export default mongoPool;