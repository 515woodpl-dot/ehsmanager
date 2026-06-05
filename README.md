# EHS Studio Manager

Photography CRM — v2.0

## Setup

```bash
npm install
cp .env.local.example .env.local   # add Stripe keys when ready
npm run build
npm start                           # runs on port 3001
```

## Deploy update to server

```bash
# From your local machine
scp -r ehsmanager root@YOUR_IP:/var/www/

# On the server
cd /var/www/ehsmanager
npm install
npm run build
pm2 restart studio-manager
```
