const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Database class for web-specific functionality
class Database {
  constructor() {
    this.db = null;
    this.client = null;
    this.collections = {};
  }

  // Initialize database connection
  async init(maxRetries = 2) {
    let lastError;
    
    // For local development
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use MongoDB Atlas connection string from environment variable
        const uri = process.env.MONGODB_URI || 'mongodb+srv://lodrlodrr:sido2010@cluster0.hneignz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        const dbName = process.env.MONGODB_DB_NAME || 'primebot';
        
        // Create MongoDB client with Render-compatible options
        const clientOptions = {
          // Basic connection options
          maxPoolSize: 1, // Reduce pool size for Render
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 10000,
          connectTimeoutMS: 5000,
          // Connection options for better reliability
          retryWrites: true,
          retryReads: true,
          // SSL/TLS options
          tls: true,
          // Force IPv4 to avoid DNS issues
          family: 4,
          // DNS and network options
          // Authentication options (using defaults)
        };
        
        // If we already have a client, try to reuse it
        if (!this.client) {
          this.client = new MongoClient(uri, clientOptions);
        }
        
        // Connect to database with a timeout
        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
        
        // Race the connection promise with a timeout
        await Promise.race([connectPromise, timeoutPromise]);
        this.db = this.client.db(dbName);
        
        console.log(`[+] Connected to MongoDB Atlas database: ${dbName}`);
        return this.db;
      } catch (err) {
        console.error(`[-] Connection attempt ${attempt} failed:`, err.message);
        lastError = err;
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, log the error but don't throw to allow app to continue
    console.error('[-] Failed to connect to database after all retries:', lastError.message);
    console.warn('[!] Database connection failed, continuing with limited functionality');
    return null;
  }
  
  // Simplified connection method for production environments
  async _simpleConnect() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://lodrlodrr:sido2010@cluster0.hneignz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const dbName = process.env.MONGODB_DB_NAME || 'primebot';
    
    // Try with minimal options
    const clientOptions = {
      tls: true,
      family: 4, // Force IPv4
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    };
    
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        console.log('Error closing existing connection:', err.message);
      }
    }
    
    this.client = new MongoClient(uri, clientOptions);
    
    // Connect with a short timeout
    const connectPromise = this.client.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Simplified connection timeout')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    this.db = this.client.db(dbName);
    
    console.log(`[+] Connected to MongoDB Atlas database (simplified): ${dbName}`);
    return this.db;
  }

  // Close database connection
  async close() {
    if (this.client) {
      await this.client.close();
      console.log('[+] Database connection closed');
    }
  }

  // Get all blacklist entries
  async getAllBlacklist() {
    try {
      // Check if database is available
      if (!this.db) {
        console.warn('[-] Database not available for getAllBlacklist');
        return [];
      }
      
      if (!this.collections.blacklist) {
        this.collections.blacklist = this.db.collection('blacklist');
      }
      
      return await this.collections.blacklist.find({}).toArray();
    } catch (err) {
      console.error('Error fetching blacklist:', err);
      return [];
    }
  }

  // Get a specific user from blacklist
  async getBlacklistUser(userId) {
    try {
      // Check if database is available
      if (!this.db) {
        console.warn('[-] Database not available for getBlacklistUser');
        return null;
      }
      
      if (!this.collections.blacklist) {
        this.collections.blacklist = this.db.collection('blacklist');
      }
      
      return await this.collections.blacklist.findOne({ id: userId });
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  }

  // Add user to blacklist
  async addToBlacklist(userData) {
    try {
      // Check if database is available
      if (!this.db) {
        console.warn('[-] Database not available for addToBlacklist');
        throw new Error('Database not available');
      }
      
      if (!this.collections.blacklist) {
        this.collections.blacklist = this.db.collection('blacklist');
      }
      
      // Check if user already exists
      const existing = await this.collections.blacklist.findOne({ id: userData.id });
      if (existing) {
        // Update existing user
        const result = await this.collections.blacklist.updateOne(
          { id: userData.id },
          { $set: userData }
        );
        return { updated: true, result };
      } else {
        // Insert new user
        const result = await this.collections.blacklist.insertOne(userData);
        return { inserted: true, result };
      }
    } catch (err) {
      console.error('Error adding user to blacklist:', err);
      throw err;
    }
  }

  // Log activity
  async logActivity(message) {
    try {
      // Check if database is available
      if (!this.db) {
        console.warn('[-] Database not available for logActivity');
        return;
      }
      
      if (!this.collections.activity) {
        this.collections.activity = this.db.collection('activity');
      }
      
      const activity = {
        message: message,
        timestamp: new Date()
      };
      
      await this.collections.activity.insertOne(activity);
    } catch (err) {
      console.error('Error logging activity:', err);
      // Don't throw error as this is not critical
    }
  }

  // Get recent activity
  async getRecentActivity(limit = 10) {
    try {
      // Check if database is available
      if (!this.db) {
        console.warn('[-] Database not available for getRecentActivity');
        return [];
      }
      
      if (!this.collections.activity) {
        this.collections.activity = this.db.collection('activity');
      }
      
      return await this.collections.activity.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (err) {
      console.error('Error fetching activity:', err);
      return [];
    }
  }
}

module.exports = Database;