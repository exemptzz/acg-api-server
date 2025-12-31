# ACG API Server

Clean API server repository for VPS deployment.

## Structure

```
final/
├── api-server/          ← Main API server code
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── cleanup-vps.sh
│   └── deploy.sh
├── .github/
│   └── workflows/
│       └── deploy.yml    ← Auto-deployment
├── .gitignore
└── README.md
```

## Quick Start

1. **Work in:** `api-server/` folder
2. **Edit:** `api-server/server.js`
3. **Push to git:** Auto-deploys to VPS
4. **Upload updates:** Put `UpdateAssistant_v{VERSION}.exe` in VPS `/opt/auth-api/updates/`

## VPS Structure

This matches: `/opt/auth-api/` on your VPS

