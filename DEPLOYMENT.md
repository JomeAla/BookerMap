# BookerMap Production Deployment Guide

## Prerequisites

- Ubuntu 22.04+ (or Windows Server 2019+)
- Node.js 18+ (LTS)
- PostgreSQL 14+
- Nginx
- PM2 (`npm install -g pm2`)
- Certbot (for SSL)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing (use a strong random string) |
| `JWT_EXPIRES_IN` | No | JWT expiry (default: `7d`) |
| `PORT` | No | API server port (default: `4000`) |
| `NODE_ENV` | No | Set to `production` in production |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack live secret key |
| `PAYSTACK_PUBLIC_KEY` | Yes | Paystack live public key |
| `PAYSTACK_WEBHOOK_SECRET` | Yes | Paystack webhook signature secret |
| `FLUTTERWAVE_PUBLIC_KEY` | Yes | Flutterwave live public key |
| `FLUTTERWAVE_SECRET_KEY` | Yes | Flutterwave live secret key |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Yes | Flutterwave encryption key |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP server port |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | Google OAuth redirect URI |
| `MICROSOFT_CLIENT_ID` | No | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | No | Microsoft OAuth client secret |

---

## Database Setup

```bash
# Create PostgreSQL database
sudo -u postgres createdb booking

# Apply migrations
cd /opt/bookermap/apps/api
npx prisma db push
# or for production migrations:
npx prisma migrate deploy
```

---

## Build

### Frontend
```bash
cd /opt/bookermap/apps/web
npm install
npm run build
```

### Backend
```bash
cd /opt/bookermap/apps/api
npm install
npm run build
npx prisma generate
```

---

## Process Manager (PM2)

### API
`apps/api/ecosystem.config.js` is provided. Start with:

```bash
cd /opt/bookermap/apps/api
pm2 start ecosystem.config.js
```

### Web
`apps/web/ecosystem.config.js` is provided. Start with:

```bash
cd /opt/bookermap/apps/web
pm2 start ecosystem.config.js
```

### Save PM2 process list
```bash
pm2 save
pm2 startup   # restart on server reboot
```

---

## Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/bookermap
server {
    listen 80;
    server_name bookermap.com www.bookermap.com;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API docs
    location /api/docs {
        proxy_pass http://127.0.0.1:4000/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase body size for file uploads
    client_max_body_size 20M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bookermap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d bookermap.com -d www.bookermap.com
```

Auto-renewal is configured automatically by Certbot. Test with:
```bash
sudo certbot renew --dry-run
```

---

## Backup Strategy

A PowerShell backup script is provided at `scripts/backup.ps1`.

### Linux cron equivalent (using pg_dump):

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /opt/bookermap/scripts/backup.sh

# Create backup script
cat > /opt/bookermap/scripts/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR=/var/backups/bookermap
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME=booking
DB_USER=postgres
mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
echo "[$(date)] Backup complete: db_$TIMESTAMP.sql.gz" >> $BACKUP_DIR/backup.log
SCRIPT
chmod +x /opt/bookermap/scripts/backup.sh
```

### Restore from backup:
```bash
gunzip -c /var/backups/bookermap/db_20260101_020000.sql.gz | psql -U postgres booking
```

---

## Monitoring Recommendations

### Health Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Overall health (DB status, memory usage, uptime) |
| `GET /health/readiness` | Readiness check (DB connected) |
| `GET /health/liveness` | Liveness check (process alive) |

### Uptime Monitoring
Use a service like UptimeRobot, Pingdom, or Healthchecks.io to ping `/health` every 5 minutes.

### Application Logs
```bash
# API logs (via PM2)
pm2 logs bookermap-api
tail -f /opt/bookermap/apps/api/logs/out.log
tail -f /opt/bookermap/apps/api/logs/err.log

# Web logs (via PM2)
pm2 logs bookermap-web
```

### Server Monitoring
- **CPU/Memory**: `htop`, `glances`
- **Disk**: `df -h`
- **PostgreSQL**: `pg_top`, `pg_stat_activity`
- **Nginx access logs**: `/var/log/nginx/access.log`

### Alerting
Set up alerts for:
- HTTP 5xx error rate > 1%
- API response time > 2s p95
- Disk usage > 80%
- Database connection failures

### Suggested Tools
- **Datadog** or **New Relic** — full APM
- **Prometheus + Grafana** — self-hosted metrics
- **Loki + Promtail** — log aggregation
- **Sentry** — error tracking

---

## Scaling Considerations

### Vertical Scaling
- Increase API instance count via PM2 cluster mode (already configured with `instances: 'max'`)
- Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=2048"`

### Horizontal Scaling
- Run multiple API instances behind the Nginx load balancer
- Use Redis for session store and rate limiting
- Configure Read Replicas for PostgreSQL

### Database
- Add indexes on frequently queried columns
- Enable `pg_stat_statements` for query performance monitoring
- Use connection pooling (PgBouncer) for high concurrency

### Caching
- Add Redis caching for frequently accessed data (tenant settings, service lists)
- Implement HTTP caching headers for static API responses

### CDN
- Serve frontend static assets via CDN (Cloudflare, CloudFront)
- Use Nginx caching for API responses where appropriate
