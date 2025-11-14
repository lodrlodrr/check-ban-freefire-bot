const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const Database = require('../database');

// Load environment variables
require('dotenv').config();

const app = express();

// Basic security headers and CORS
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'), {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Initialize database with lazy connection
let dbInstance = null;

// Function to get database instance
function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

// Database connection check middleware
app.use(async (req, res, next) => {
  try {
    const db = getDatabase();
    
    // Initialize database connection if not already connected
    if (!db.client || !db.client.isConnected()) {
      console.log('Initializing database connection...');
      await db.init();
    }
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    next(error);
  }
});

// API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Session middleware with MongoDB store for production
let sessionMiddleware;
if (process.env.MONGODB_URI) {
  try {
    // Try to create MongoDB session store
    sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || 'fallback_secret',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      },
      // Add rolling sessions to extend session on each request
      rolling: true,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME || 'primebot',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 24 hours
        autoRemove: 'native',
        touchAfter: 24 * 3600 // period in seconds to check if session has expired
      })
    });
  } catch (err) {
    console.warn('[!] Failed to create MongoDB session store, falling back to MemoryStore:', err.message);
    // Fallback to MemoryStore if MongoDB session store fails
    sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || 'fallback_secret',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      },
      // Add rolling sessions to extend session on each request
      rolling: true
    });
  }
} else {
  // Use default MemoryStore in development
  sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    // Add rolling sessions to extend session on each request
    rolling: true
  });
}

app.use(sessionMiddleware);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Discord OAuth2 strategy with better error handling
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
  scope: ['identify', 'email', 'guilds.join', 'guilds.members.read']
}, async function(accessToken, refreshToken, profile, done) {
  try {
    const db = getDatabase();
    
    // Initialize database if not already done
    if (!db.db) {
      await db.init();
    }
    
    // Check if database is available
    if (!db.db) {
      console.warn('[-] Database not available for user save');
      // Continue without saving to database
      const user = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar,
        discriminator: profile.discriminator,
        access_token: accessToken,
        refresh_token: refreshToken,
        lastLogin: new Date()
      };
      return done(null, user);
    }
    
    // Initialize users collection if not already done
    if (!db.collections.users) {
      db.collections.users = db.db.collection('users');
    }
    
    // Save user to database with tokens
    const user = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
      discriminator: profile.discriminator,
      access_token: accessToken,
      refresh_token: refreshToken,
      lastLogin: new Date()
    };
    
    // Upsert user (insert if not exists, update if exists)
    const result = await db.collections.users.updateOne(
      { id: profile.id },
      { $set: user },
      { upsert: true }
    );
    
    // User authenticated and saved to database
    console.log(`[+] User ${profile.username} (${profile.id}) login successfully`);
    
    return done(null, user);
  } catch (err) {
    console.error('[-] Error saving user to database:', err);
    // Still authenticate the user even if database save fails
    const user = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
      discriminator: profile.discriminator
    };
    return done(null, user);
  }
}));

// Serialize user
passport.serializeUser(function(user, done) {
  // Serializing user
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async function(id, done) {
  try {
    // Deserializing user with ID
    const db = getDatabase();
    
    // Initialize database if not already done
    if (!db.db) {
      await db.init();
    }
    
    // Check if database is available
    if (!db.db) {
      console.warn('[-] Database not available for user deserialization');
      // Return a minimal user object
      return done(null, { id: id });
    }
    
    // Initialize users collection if not already done
    if (!db.collections.users) {
      db.collections.users = db.db.collection('users');
    }
    
    const user = await db.collections.users.findOne({ id: id });
    // Found user in database
    if (user) {
      
      done(null, user);
    } else {
     
      // Return a minimal user object
      done(null, { id: id });
    }
  } catch (err) {
    console.error('[DEBUG] Error deserializing user:', err);
    // Return a minimal user object even if there's an error
    done(null, { id: id });
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  // Session debugging removed
  
  if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    // User is authenticated, proceeding to next middleware
    return next();
  } else if (req.isAuthenticated && typeof req.isAuthenticated !== 'function' && req.isAuthenticated && req.user) {
    // User is authenticated (property), proceeding to next middleware
    return next();
  }
  
  // User not authenticated, redirecting to login
  
  res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
 
  res.sendFile(path.join(__dirname, '..', 'html', 'index.html'));
});

app.get('/login', (req, res) => {
  
  res.sendFile(path.join(__dirname, '..', 'html', 'login.html'));
});

// Discord OAuth2 routes
app.get('/auth/discord', passport.authenticate('discord'));

// Discord OAuth2 callback route
app.get('/auth/discord/callback', 
  function(req, res, next) {
    passport.authenticate('discord', function(err, user, info) {
      if (err) {
        console.error('[-] Discord authentication error:', err);
        // Check if it's an invalid_client error
        if (err.message && err.message.includes('invalid_client')) {
          return res.redirect('/login?error=invalid_client&message=Discord application credentials are invalid. Please contact the administrator.');
        }
        return res.redirect('/login?error=failed&message=Authentication error: ' + encodeURIComponent(err.message));
      }
      if (!user) {
        console.error('[-] Discord authentication failed:', info);
        return res.redirect('/login?error=failed&message=Failed to authenticate with Discord');
      }
      
      // Log the user in
      req.logIn(user, async function(err) {
        if (err) {
          
          return res.redirect('/login?error=failed&message=Login error: ' + encodeURIComponent(err.message));
        }
        
        // Log successful login activity
        try {
          const db = getDatabase();
          if (db.db) { // Only log if database is available
            await db.logActivity(`User ${user.username} logged in`);
          }
        } catch (logErr) {
          console.error('Error logging activity:', logErr);
        }
        
        
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  });

// Logout route
app.get('/logout', (req, res) => {
  const username = req.user ? req.user.username : 'Unknown';
  req.logout(function(err) {
    if (err) { 
      
      return next(err); 
    }
    
    res.redirect('/');
  });
});

// Dashboard route (protected)
app.get('/dashboard', isAuthenticated, (req, res) => {
  // Serving dashboard to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'dashboard.html'));
});

// Settings route (protected)
app.get('/settings', isAuthenticated, (req, res) => {
  // Serving settings page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'settings.html'));
});

// Settings HTML route (public)
app.get('/settings.html', (req, res) => {
  // Serving settings page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'settings.html'));
});

// Checkuser route (public)
app.get('/checkuser', (req, res) => {
  // Serving checkuser page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'checkuser.html'));
});

// Checkuser HTML route (public)
app.get('/checkuser.html', (req, res) => {
  // Serving checkuser page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'checkuser.html'));
});

// Features route (public)
app.get('/features', (req, res) => {
  // Serving features page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'features.html'));
});

// Features HTML route (public)
app.get('/features.html', (req, res) => {
  // Serving features page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'features.html'));
});

// Pricing route (public)
app.get('/pricing', (req, res) => {
  // Serving pricing page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'pricing.html'));
});

// Pricing HTML route (public)
app.get('/pricing.html', (req, res) => {
  // Serving pricing page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'pricing.html'));
});

// Contact route (public)
app.get('/contact', (req, res) => {
  // Serving contact page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'contact.html'));
});

// Contact HTML route (public)
app.get('/contact.html', (req, res) => {
  // Serving contact page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'contact.html'));
});

// About route (public)
app.get('/about', (req, res) => {
  // Serving about page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'about.html'));
});

// About HTML route (public)
app.get('/about.html', (req, res) => {
  // Serving about page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'about.html'));
});

// Banned HTML route (public)
app.get('/Banned.html', (req, res) => {
  // Serving banned page to user
 
  res.sendFile(path.join(__dirname, '..', 'html', 'Banned.html'));
});

// API endpoint to get blacklist data
app.get('/api/blacklist', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    
    const blacklist = await db.getAllBlacklist();
    
    // Calculate stats
    const now = Date.now();
    const stats = {
      total: blacklist.length,
      permanent: blacklist.filter(user => !user.expiresAt).length,
      temporary: blacklist.filter(user => user.expiresAt && user.expiresAt > now).length,
      expired: blacklist.filter(user => user.expiresAt && user.expiresAt <= now).length
    };
    
    res.json({
      success: true,
      data: blacklist,
      stats: stats
    });
  } catch (err) {
    console.error('Error fetching blacklist:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist data'
    });
  }
});

// API endpoint to add a user to the blacklist (protected)
app.post('/api/blacklist', isAuthenticated, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    const { userId, username, reason, server } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'User ID and username are required'
      });
    }
    
    const userData = {
      id: userId,
      username: username,
      reason: reason || 'Added via dashboard',
      server: server || 'Unknown',
      date: new Date().toISOString(),
      addedBy: req.user.username || req.user.id,
    };
    
    const result = await db.addToBlacklist(userData);
    
    // Log activity
    try {
      if (db.db) { // Only log if database is available
        await db.logActivity(`User ${username} (${userId}) added to blacklist by ${req.user.username || req.user.id}`);
        console.log(`[+] User ${username} added to blacklist by ${req.user.username || req.user.id}`);
      }
    } catch (logErr) {
      console.error('Error logging activity:', logErr);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Error adding user to blacklist:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to add user to blacklist'
    });
  }
});

// API endpoint to get a specific user
app.get('/api/blacklist/:userId', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    const userId = req.params.userId;
   
    const user = await db.getBlacklistUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found in blacklist'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

// API endpoint to get blacklist stats
app.get('/api/stats', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    
    const blacklist = await db.getAllBlacklist();
    
    const now = Date.now();
    // Total should only count active bans (not expired ones)
    const activeBans = blacklist.filter(user => !user.expiresAt || (user.expiresAt && user.expiresAt > now));
    const stats = {
      total: activeBans.length,
      permanent: blacklist.filter(user => !user.expiresAt).length
      // Note: Temporary and Expired bans have been removed per requirements
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// API endpoint to check if a user is authenticated
app.get('/api/auth/check', (req, res) => {
  // API auth check request received
  // Session debugging removed
  
  if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    // API: User is authenticated, sending success response
  
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        access_token: req.user.access_token,
        refresh_token: req.user.refresh_token
      }
    });
  } else if (req.isAuthenticated && typeof req.isAuthenticated !== 'function' && req.isAuthenticated && req.user) {
    // API: User is authenticated (property), sending success response
    
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        access_token: req.user.access_token,
        refresh_token: req.user.refresh_token
      }
    });
  } else {
    // API: User not authenticated, sending failure response
    
    res.json({ authenticated: false });
  }
});

// API endpoint to get all users (for admin purposes)
app.get('/api/users', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    // Initialize users collection if not already done
    if (!db.collections.users) {
      db.collections.users = db.db.collection('users');
    }
    
    console.log('[+] Fetching all users');
    const users = await db.collections.users.find({}).toArray();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// API endpoint to get user tokens (protected)
app.get('/api/user/tokens', isAuthenticated, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    // Initialize users collection if not already done
    if (!db.collections.users) {
      db.collections.users = db.db.collection('users');
    }
    
    // Get user tokens (exclude sensitive info from response)
    const user = await db.collections.users.findOne(
      { id: req.user.id },
      { projection: { access_token: 1, refresh_token: 1, lastLogin: 1 } }
    );
    
    if (user) {
      console.log(`[+] Fetching tokens for user ${req.user.username || req.user.id}`);
      res.json({
        success: true,
        data: {
          access_token: user.access_token,
          refresh_token: user.refresh_token,
          lastLogin: user.lastLogin
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (err) {
    console.error('Error fetching user tokens:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user tokens'
    });
  }
});

// API endpoint to get recent activity (protected)
app.get('/api/activity', isAuthenticated, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if database is available
    if (!db.db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    // Fetch real activity data from database
   
    const activities = await db.getRecentActivity(10);
    
    res.json({
      success: true,
      activities: activities
    });
  } catch (err) {
    console.error('Error fetching activity data:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity data'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const db = dbInstance;
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db && db.db ? 'connected' : 'disconnected'
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
    return res.status(503).json({
      error: 'Database Error',
      message: 'A database error occurred'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Function to start the server
function startServer() {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  
  app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ الخادم يعمل | Server is running');
    console.log('='.repeat(50));
    console.log(`🌐 العنوان | Host: ${HOST}`);
    console.log(`🔌 المنفذ | Port: ${PORT}`);
    console.log(`🔗 الرابط | URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`📝 البيئة | Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Show configuration status
    console.log('\n📋 حالة الإعدادات | Configuration Status:');
    console.log(`   Discord OAuth2: ${process.env.DISCORD_CLIENT_ID ? '✅' : '❌'}`);
    console.log(`   MongoDB: ${process.env.MONGODB_URI ? '✅' : '⚠️  (MemoryStore)'}`);
    console.log(`   Session Secret: ${process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'fallback_secret' ? '✅' : '⚠️ '}`);
    
    console.log('\n' + '='.repeat(50) + '\n');
  }).on('error', (err) => {
    console.error('\n❌ خطأ في بدء الخادم | Server startup error:');
    if (err.code === 'EADDRINUSE') {
      console.error(`   المنفذ ${PORT} مستخدم بالفعل | Port ${PORT} is already in use`);
      console.error(`   💡 الحل | Solution: غير المنفذ في ملف .env أو أوقف التطبيق الذي يستخدمه`);
      console.error(`   💡 Solution: Change PORT in .env file or stop the application using it`);
    } else if (err.code === 'EACCES') {
      console.error(`   لا يمكن الوصول إلى المنفذ ${PORT} | Cannot access port ${PORT}`);
      console.error(`   💡 الحل | Solution: استخدم منفذ آخر أو شغّل كمسؤول`);
      console.error(`   💡 Solution: Use a different port or run as administrator`);
    } else {
      console.error(`   ${err.message}`);
    }
    process.exit(1);
  });
}

module.exports = { app, startServer };