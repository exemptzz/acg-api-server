const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Auto-deployment test - 2025-01-21
// Testing Discord webhook notification
// Testing SSH authentication fix
// Testing complete SSH key format
// TEST: Auto-deploy check - $(date) - If you see this on VPS, auto-deploy works!
const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting for security (optional - install express-rate-limit if needed)
let limiter;
try {
    const rateLimit = require('express-rate-limit');
    limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);
    console.log('Rate limiting enabled');
} catch (err) {
    console.warn('express-rate-limit not installed. Rate limiting disabled. Install with: npm install express-rate-limit');
}

// Configuration - Uses environment variables for security
// Set these in your .env file or environment
const CONFIG = {
    API_KEY: process.env.API_KEY || 'Bearer be886aeb8dbfef0f1c58eb13cbef84a3e8af25ca57c7f5a6ef1f2977515bd617', // Your API key (use env var in production)
    USER_AGENT: process.env.USER_AGENT || 'CustomClient/1.0', // Should match your client's user agent
    APP_VERSION: process.env.APP_VERSION || '1.0'
};

// Middleware - CORS configuration
app.use(cors({
    origin: ['https://acgbypass.com', 'http://acgbypass.com', 'http://localhost:3000', '*'], // Allow specific origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

app.use(bodyParser.json());

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            hwid TEXT,
            role TEXT DEFAULT 'user',
            is_banned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Subscriptions table
        db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subscription_type TEXT NOT NULL,
            expired INTEGER DEFAULT 0,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Insert a test user (for testing - remove in production)
        db.run(`INSERT OR IGNORE INTO users (discord_id, username, hwid, role, is_banned) 
                VALUES ('123456789', 'TestUser', 'test-hwid-123', 'admin', 0)`, (err) => {
            if (!err) {
                db.run(`INSERT OR IGNORE INTO subscriptions (user_id, subscription_type, expired, expires_at) 
                        VALUES (1, 'ExternalCheatFiveM', 0, datetime('now', '+30 days'))`);
            }
        });
    });
}

// Middleware to verify API key
function verifyApiKey(req, res, next) {
    const authHeader = req.headers['authorization'];
    const userAgent = req.headers['user-agent'];

    if (!authHeader || authHeader !== CONFIG.API_KEY) {
        return res.status(401).json({ message: 'Invalid authorization key' });
    }

    if (!userAgent || !userAgent.includes(CONFIG.USER_AGENT)) {
        return res.status(401).json({ message: 'Invalid user agent' });
    }

    next();
}

// Setup endpoint - checks version compatibility
app.post('/api/client/cheatauth/setup', verifyApiKey, (req, res) => {
    const { Version } = req.body;

    if (!Version) {
        return res.status(400).json({ message: 'Version is required' });
    }

    // Check if version is compatible
    if (Version === CONFIG.APP_VERSION) {
        res.json({ message: 'success' });
    } else {
        res.status(400).json({ message: 'Version mismatch' });
    }
});

// Login endpoint - authenticates user with Discord ID and HWID
app.post('/api/client/cheatauth/login', verifyApiKey, (req, res) => {
    const { DiscordId, Hwid } = req.body;

    if (!DiscordId || !Hwid) {
        return res.status(400).json({ message: 'DiscordId and Hwid are required' });
    }

    // Find user by Discord ID
    db.get(
        `SELECT * FROM users WHERE discord_id = ?`,
        [DiscordId],
        (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // Check if user is banned
            if (user.is_banned === 1) {
                return res.status(403).json({ message: 'User is banned' });
            }

            // Update HWID if it's different (optional - for HWID binding)
            if (user.hwid !== Hwid) {
                db.run(
                    `UPDATE users SET hwid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [Hwid, user.id]
                );
            }

            // Get user subscriptions
            db.all(
                `SELECT subscription_type, expired, expires_at FROM subscriptions 
                 WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
                [user.id],
                (err, subscriptions) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    // Format subscriptions
                    const formattedSubs = subscriptions.map(sub => ({
                        Type: sub.subscription_type,
                        Expired: sub.expired === 1,
                        ExpiresAt: sub.expires_at
                    }));

                    // If no active subscriptions, return empty array (client will exit)
                    const activeSubs = formattedSubs.filter(sub => !sub.Expired);
                    if (activeSubs.length === 0) {
                        formattedSubs.push({
                            Type: 'ExternalCheatFiveM',
                            Expired: true
                        });
                    }

                    // Return success response
                    res.json({
                        message: 'success',
                        data: {
                            _id: user.discord_id,
                            Info: {
                                UserName: user.username,
                                CheatHwid: Hwid,
                                Ban: {
                                    IsBanned: user.is_banned === 1
                                },
                                Role: user.role
                            },
                            Subscriptions: formattedSubs
                        }
                    });
                }
            );
        }
    );
});

// Admin endpoint to add users (for testing/managing)
app.post('/api/admin/add-user', verifyApiKey, (req, res) => {
    const { discord_id, username, hwid, role, subscription_type } = req.body;

    if (!discord_id || !username) {
        return res.status(400).json({ message: 'discord_id and username are required' });
    }

    db.run(
        `INSERT INTO users (discord_id, username, hwid, role) VALUES (?, ?, ?, ?)`,
        [discord_id, username, hwid || null, role || 'user'],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ message: 'User already exists' });
                }
                return res.status(500).json({ message: 'Database error' });
            }

            const userId = this.lastID;

            // Add subscription if provided
            if (subscription_type) {
                db.run(
                    `INSERT INTO subscriptions (user_id, subscription_type, expired, expires_at) 
                     VALUES (?, ?, 0, datetime('now', '+30 days'))`,
                    [userId, subscription_type]
                );
            }

            res.json({ message: 'User added successfully', user_id: userId });
        }
    );
});

// Admin endpoint to ban/unban users
app.post('/api/admin/ban-user', verifyApiKey, (req, res) => {
    const { discord_id, is_banned } = req.body;

    if (!discord_id || typeof is_banned !== 'boolean') {
        return res.status(400).json({ message: 'discord_id and is_banned (boolean) are required' });
    }

    db.run(
        `UPDATE users SET is_banned = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?`,
        [is_banned ? 1 : 0, discord_id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: `User ${is_banned ? 'banned' : 'unbanned'} successfully` });
        }
    );
});

// Admin endpoint to get all users
app.get('/api/admin/users', verifyApiKey, (req, res) => {
    db.all(
        `SELECT u.id, u.discord_id, u.username, u.hwid, u.role, u.is_banned, 
                u.created_at, u.updated_at,
                GROUP_CONCAT(s.subscription_type || '|' || COALESCE(s.expires_at, '')) as subscriptions
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.expired = 0
         GROUP BY u.id
         ORDER BY u.created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            const users = rows.map(row => {
                const subs = row.subscriptions ? row.subscriptions.split(',').map((sub) => {
                    const [type, expires_at] = sub.split('|');
                    return { type, expires_at: expires_at || null };
                }) : [];
                
                return {
                    id: row.id,
                    discord_id: row.discord_id,
                    username: row.username,
                    hwid: row.hwid,
                    role: row.role,
                    is_banned: row.is_banned === 1,
                    subscriptions: subs,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                };
            });

            res.json({ users, count: users.length });
        }
    );
});

// Admin endpoint to get a specific user
app.get('/api/admin/users/:discord_id', verifyApiKey, (req, res) => {
    const { discord_id } = req.params;

    db.get(
        `SELECT u.*, GROUP_CONCAT(s.subscription_type) as subscriptions
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.expired = 0
         WHERE u.discord_id = ?
         GROUP BY u.id`,
        [discord_id],
        (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({
                id: user.id,
                discord_id: user.discord_id,
                username: user.username,
                hwid: user.hwid,
                role: user.role,
                is_banned: user.is_banned === 1,
                subscriptions: user.subscriptions ? user.subscriptions.split(',') : [],
                created_at: user.created_at,
                updated_at: user.updated_at
            });
        }
    );
});

// Admin endpoint to remove/delete users
app.delete('/api/admin/users/:discord_id', verifyApiKey, (req, res) => {
    const { discord_id } = req.params;

    // First delete subscriptions
    db.run(
        `DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE discord_id = ?)`,
        [discord_id],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            // Then delete user
            db.run(
                `DELETE FROM users WHERE discord_id = ?`,
                [discord_id],
                function(err) {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ message: 'User not found' });
                    }

                    res.json({ message: 'User deleted successfully' });
                }
            );
        }
    );
});

// Admin endpoint to update user
app.put('/api/admin/users/:discord_id', verifyApiKey, (req, res) => {
    const { discord_id } = req.params;
    const { username, hwid, role, subscription_type, subscription_expires_days } = req.body;

    // Update user info
    const updates = [];
    const values = [];

    if (username !== undefined) {
        updates.push('username = ?');
        values.push(username);
    }
    if (hwid !== undefined) {
        updates.push('hwid = ?');
        values.push(hwid);
    }
    if (role !== undefined) {
        updates.push('role = ?');
        values.push(role);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(discord_id);

    db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE discord_id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Update subscription if provided
            if (subscription_type) {
                db.get(`SELECT id FROM users WHERE discord_id = ?`, [discord_id], (err, user) => {
                    if (!err && user) {
                        const expiresDays = subscription_expires_days || 30;
                        db.run(
                            `INSERT OR REPLACE INTO subscriptions (user_id, subscription_type, expired, expires_at)
                             VALUES (?, ?, 0, datetime('now', '+' || ? || ' days'))`,
                            [user.id, subscription_type, expiresDays]
                        );
                    }
                });
            }

            res.json({ message: 'User updated successfully' });
        }
    );
});

// Health check endpoint
// Version check endpoint - for auto-update system
app.get('/api/client/cheatauth/version', verifyApiKey, (req, res) => {
    res.json({
        version: CONFIG.APP_VERSION,
        latest_version: CONFIG.APP_VERSION
    });
});

// Update download URL endpoint - for auto-update system
app.get('/api/client/cheatauth/update', verifyApiKey, (req, res) => {
    // Host update files on VPS at /opt/auth-api/updates/
    // Format: http://your-vps-ip:3000/updates/UpdateAssistant_v{VERSION}.exe
    const vpsIp = process.env.VPS_IP || '79.137.32.252';
    const vpsPort = process.env.PORT || 3000;
    const downloadUrl = process.env.UPDATE_DOWNLOAD_URL || 
        `http://${vpsIp}:${vpsPort}/updates/UpdateAssistant_v${CONFIG.APP_VERSION}.exe`;
    
    // Try to get file size if file exists
    const fs = require('fs');
    const updatePath = path.join('/opt/auth-api/updates', `UpdateAssistant_v${CONFIG.APP_VERSION}.exe`);
    let fileSize = 0;
    try {
        if (fs.existsSync(updatePath)) {
            fileSize = fs.statSync(updatePath).size;
        }
    } catch (err) {
        // Ignore errors
    }
    
    res.json({
        download_url: downloadUrl,
        version: CONFIG.APP_VERSION,
        size: fileSize
    });
});

// Serve update files from /opt/auth-api/updates/
app.use('/updates', express.static('/opt/auth-api/updates', {
    setHeaders: (res, path) => {
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', 'attachment');
    }
}));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== Authentication API Server ===`);
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`API Key: ${CONFIG.API_KEY}`);
    console.log(`User Agent: ${CONFIG.USER_AGENT}`);
    console.log(`\nClient Endpoints:`);
    console.log(`  POST /api/client/cheatauth/setup`);
    console.log(`  POST /api/client/cheatauth/login`);
    console.log(`  GET  /api/client/cheatauth/version`);
    console.log(`  GET  /api/client/cheatauth/update`);
    console.log(`\nAdmin Endpoints:`);
    console.log(`  POST   /api/admin/add-user`);
    console.log(`  POST   /api/admin/ban-user`);
    console.log(`  GET    /api/admin/users`);
    console.log(`  GET    /api/admin/users/:discord_id`);
    console.log(`  PUT    /api/admin/users/:discord_id`);
    console.log(`  DELETE /api/admin/users/:discord_id`);
    console.log(`\n  GET  /health\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});

