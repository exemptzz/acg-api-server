# Authentication API Server

A Node.js/Express API server for authenticating your custom client application.

## Features

- User authentication with Discord ID and Hardware ID (HWID)
- Subscription management
- Ban system
- SQLite database for easy setup
- Admin endpoints for user management

## Setup Instructions

### 1. Install Dependencies

```bash
cd api-server
npm install
```

### 2. Configure API Key

Edit `server.js` and change the `CONFIG` object:

```javascript
const CONFIG = {
    API_KEY: 'Bearer YOUR_SECRET_API_KEY_HERE', // Change this!
    USER_AGENT: 'CustomClient/1.0', // Should match your client
    APP_VERSION: '1.0'
};
```

### 3. Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### Client Endpoints

#### POST `/api/client/cheatauth/setup`
Checks version compatibility.

**Request:**
```json
{
  "Version": "1.0"
}
```

**Response:**
```json
{
  "message": "success"
}
```

#### POST `/api/client/cheatauth/login`
Authenticates a user.

**Request:**
```json
{
  "DiscordId": "123456789",
  "Hwid": "user-hwid-here"
}
```

**Response:**
```json
{
  "message": "success",
  "data": {
    "_id": "123456789",
    "Info": {
      "UserName": "TestUser",
      "CheatHwid": "user-hwid-here",
      "Ban": {
        "IsBanned": false
      },
      "Role": "admin"
    },
    "Subscriptions": [
      {
        "Type": "ExternalCheatFiveM",
        "Expired": false,
        "ExpiresAt": "2024-02-15 12:00:00"
      }
    ]
  }
}
```

### Admin Endpoints

#### POST `/api/admin/add-user`
Add a new user to the system.

**Request:**
```json
{
  "discord_id": "123456789",
  "username": "NewUser",
  "hwid": "optional-hwid",
  "role": "user",
  "subscription_type": "ExternalCheatFiveM"
}
```

#### POST `/api/admin/ban-user`
Ban or unban a user.

**Request:**
```json
{
  "discord_id": "123456789",
  "is_banned": true
}
```

## Database Schema

The server uses SQLite with two main tables:

### users
- `id` - Primary key
- `discord_id` - Unique Discord ID
- `username` - User's username
- `hwid` - Hardware ID (optional)
- `role` - User role (default: 'user')
- `is_banned` - Ban status (0 or 1)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### subscriptions
- `id` - Primary key
- `user_id` - Foreign key to users
- `subscription_type` - Type of subscription (e.g., "ExternalCheatFiveM")
- `expired` - Expiration status (0 or 1)
- `expires_at` - Expiration date/time
- `created_at` - Creation timestamp

## Testing

A test user is automatically created:
- Discord ID: `123456789`
- Username: `TestUser`
- Role: `admin`
- Has active subscription

You can test the API using curl:

```bash
# Setup
curl -X POST http://localhost:3000/api/client/cheatauth/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_API_KEY_HERE" \
  -H "User-Agent: CustomClient/1.0" \
  -d '{"Version":"1.0"}'

# Login
curl -X POST http://localhost:3000/api/client/cheatauth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_API_KEY_HERE" \
  -H "User-Agent: CustomClient/1.0" \
  -d '{"DiscordId":"123456789","Hwid":"test-hwid-123"}'
```

## Client Configuration

Update your client's `Security/Api/api.hpp`:

```cpp
const std::string api_ip = xorstr( "http://localhost:3000/" );
const std::string suser_agent = xorstr( "CustomClient/1.0" );
const std::string authorization_key = xorstr( "Bearer YOUR_SECRET_API_KEY_HERE" );
```

## Production Deployment

1. **Change the API key** to a strong, random value
2. **Remove the test user** creation code
3. **Use environment variables** for sensitive config:
   ```javascript
   const CONFIG = {
       API_KEY: process.env.API_KEY || 'Bearer YOUR_SECRET_API_KEY_HERE',
       USER_AGENT: process.env.USER_AGENT || 'CustomClient/1.0',
       APP_VERSION: process.env.APP_VERSION || '1.0'
   };
   ```
4. **Use HTTPS** in production
5. **Consider using PostgreSQL/MySQL** instead of SQLite for production
6. **Add rate limiting** to prevent abuse
7. **Add logging** for security monitoring

## Security Notes

- The API key should be kept secret
- Use HTTPS in production
- Consider implementing rate limiting
- Add input validation and sanitization
- Regularly update dependencies
- Monitor for suspicious activity

