# VPS Deployment Guide

## Prerequisites
- VPS with SSH access
- Docker & Docker Compose installed
- MongoDB (local or Atlas)
- Domain pointed to VPS (optional)

## Quick Deploy

### 1. Copy files to VPS
```bash
scp -r . user@your-vps:/opt/tracking-bot/
```

### 2. Configure environment
```bash
cd /opt/tracking-bot
cp server/.env.production server/.env
nano server/.env  # edit values
```

Required `.env` variables:
- `MONGODB_URI` — MongoDB connection string
- `BOT_TOKEN` — Telegram bot token from @BotFather
- `PUBLIC_URL` — your Vercel client URL (e.g., `https://your-app.vercel.app`)

### 3. Start containers
```bash
docker compose up -d --build
```

### 4. Setup Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/tracking-bot
sudo ln -s /etc/nginx/sites-available/tracking-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Commands
```bash
docker compose logs -f      # view logs
docker compose restart       # restart
docker compose down          # stop
docker compose up -d --build # rebuild & start
```

## Vercel Client Setup
Set in Vercel dashboard or `vercel.json`:
```
API_URL=https://your-vps-domain.com
```

Or update client `vite.config.js` proxy to your VPS domain before deploy.