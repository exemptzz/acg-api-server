# 🚀 Fresh Git Repo Setup Instructions

## What I Did

1. ✅ Created clean `final/` folder
2. ✅ Copied only essential files:
   - `api-server/server.js`
   - `api-server/package.json`
   - `api-server/package-lock.json`
   - `api-server/README.md`
   - `api-server/cleanup-vps.sh`
   - `api-server/deploy.sh`
   - `.github/workflows/deploy.yml`
   - `.gitignore`
   - `README.md`
3. ✅ Initialized fresh git repo
4. ✅ Added remote (your GitHub repo)

---

## Next Steps

### 1. Commit and Push to GitHub

```powershell
cd "C:\Users\uiopp\Desktop\ACG Devolpments\Work\API\final"

# Check what will be committed
git status

# Commit
git commit -m "Initial commit - clean API server structure"

# Push to GitHub (force push to replace old repo)
git push -f origin main
```

**⚠️ Warning:** `-f` will overwrite the old repo. Make sure you want to do this!

---

### 2. Recreate VPS (Clean Setup)

```bash
# SSH into VPS
ssh ubuntu@79.137.32.252

# Stop service
sudo systemctl stop auth-api

# Remove old directory
sudo rm -rf /opt/auth-api

# Create fresh structure
sudo mkdir -p /opt/auth-api/api-server
sudo mkdir -p /opt/auth-api/updates
sudo mkdir -p /opt/auth-api/logs
sudo mkdir -p /opt/auth-api/backups
sudo chown -R ubuntu:ubuntu /opt/auth-api

# Clone fresh repo
cd /opt/auth-api/api-server
git clone https://github.com/exemptzz/acg-api-server.git .

# Install dependencies
npm install --production

# Create systemd service (if not exists)
sudo nano /etc/systemd/system/auth-api.service
```

Paste this:
```ini
[Unit]
Description=Authentication API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/auth-api/api-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then:
```bash
# Reload and start
sudo systemctl daemon-reload
sudo systemctl enable auth-api
sudo systemctl start auth-api
sudo systemctl status auth-api
```

---

## What's in This Repo

**Only essential files:**
- ✅ `api-server/server.js` - Main API code
- ✅ `api-server/package.json` - Dependencies
- ✅ `api-server/package-lock.json` - Lock file
- ✅ `api-server/README.md` - API docs
- ✅ `api-server/cleanup-vps.sh` - Cleanup script
- ✅ `api-server/deploy.sh` - Deployment script
- ✅ `.github/workflows/deploy.yml` - Auto-deployment
- ✅ `.gitignore` - Git ignore rules
- ✅ `README.md` - This repo's readme

**No extra files!** Clean and minimal. 🎉

---

## Workflow Going Forward

1. **Edit files** in `final/api-server/`
2. **Commit changes:**
   ```powershell
   cd "C:\Users\uiopp\Desktop\ACG Devolpments\Work\API\final"
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. **Auto-deploys** to VPS via GitHub Actions

---

**Ready to push!** ✅

