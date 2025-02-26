# Deployment Guide for Scheduling API

This comprehensive deployment guide will help you set up the Scheduling API application in various environments, from development to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Development Deployment](#development-deployment)
5. [Production Deployment](#production-deployment)
   - [Docker Deployment](#docker-deployment)
   - [Kubernetes Deployment](#kubernetes-deployment)
6. [SSL Configuration](#ssl-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the Scheduling API, ensure you have the following:

- Node.js v18 or higher
- PostgreSQL database
- Redis instance
- Auth0 account with API and application set up
- Docker and Docker Compose (for containerized deployment)
- Kubernetes cluster (for production deployment)
- SMTP server for email notifications

## Environment Configuration

The application requires several environment variables to function properly:

### Core Configuration
```
NODE_ENV=production  # Use 'development' for development environment
PORT=3000            # The port on which the API will run
```

### Database Configuration
```
DATABASE_URL=postgresql://username:password@host:port/database_name
```

### Redis Configuration
```
REDIS_URL=redis://host:port
```

### Auth0 Configuration
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_CLIENT_ID=your-client-id
AUTH0_MANAGEMENT_CLIENT_ID=your-management-api-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-api-client-secret
```

### Email Configuration
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

Create a `.env` file in the project root with these variables for development. For production, inject these as environment variables in your deployment platform.

> ⚠️ **IMPORTANT**: Never commit the `.env` file or any file containing actual credentials to your repository.

## Database Setup

Before deployment, you need to set up the database:

1. Ensure PostgreSQL is running and accessible
2. Create a new database for the application
3. Run migrations to create the schema:

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

For a fresh installation, you may want to seed the database with initial data:

```bash
npm run prisma:seed
```

## Development Deployment

For local development:

1. Clone the repository:
```bash
git clone <repository-url>
cd scheduling-api
```

2. Install dependencies:
```bash
npm install
```

3. Create and configure the `.env` file with appropriate values

4. Start the development server:
```bash
npm run dev
```

Using Docker Compose for development:
```bash
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- API server on port 3005
- Admin dashboard on port 3001

## Production Deployment

### Docker Deployment

For a production-like environment using Docker:

1. Create a `docker-compose.prod.yml` file:
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://username:password@db:5432/scheduling_db
      - REDIS_URL=redis://redis:6379
      # Add all other environment variables here
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=username
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=scheduling_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

2. Run the production stack:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

For a scalable production environment, use Kubernetes:

1. Ensure your Kubernetes cluster is set up
2. Apply the base configuration:
```bash
kubectl apply -k k8s/base
```

3. Configure the appropriate namespace and resource limits in the overlay files
4. Apply environment-specific configurations:
```bash
kubectl apply -k k8s/overlays/production
```

The Kubernetes configuration includes:
- Deployment with multiple replicas
- Horizontal Pod Autoscaler for automatic scaling
- Services for networking
- ConfigMaps and Secrets for configuration
- Persistent volume claims for database storage

## SSL Configuration

For production, secure your API with SSL/TLS:

1. Using Nginx as a reverse proxy:
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. For Kubernetes, use an Ingress controller with TLS:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: scheduling-api
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: scheduling-api-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: scheduling-api
            port:
              number: 3000
```

## Monitoring and Logging

Set up monitoring and logging for your production deployment:

1. Application logs: Configure a logging service like Datadog, Logstash, or CloudWatch
2. Performance monitoring: Use a service like New Relic or Prometheus with Grafana
3. Uptime monitoring: Set up alerts with a service like Pingdom or Uptime Robot

For Kubernetes, consider:
```bash
# Install Prometheus and Grafana
helm install prometheus prometheus-community/prometheus
helm install grafana grafana/grafana
```

## Backup and Recovery

Implement a backup strategy for your production database:

1. Regular automated backups:
```bash
# PostgreSQL backup script
pg_dump -U username -h hostname scheduling_db > backup-$(date +%Y%m%d).sql
```

2. Backup retention policy (keep backups for 30 days, weekly for 3 months)
3. Test restoration procedures periodically

For Kubernetes, use a CronJob:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # Every day at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - pg_dump -U username -h db-service scheduling_db > /backup/backup-$(date +%Y%m%d).sql
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## CI/CD Pipeline

Set up a CI/CD pipeline for automated testing and deployment:

1. GitHub Actions configuration:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        uses: docker/build-push-action@v2
        with:
          push: true
          tags: yourregistry/scheduling-api:latest
      - name: Deploy to Kubernetes
        uses: steebchen/kubectl@v2
        with:
          config: ${{ secrets.KUBE_CONFIG_DATA }}
          command: apply -k k8s/overlays/production
      - name: Verify deployment
        uses: steebchen/kubectl@v2
        with:
          config: ${{ secrets.KUBE_CONFIG_DATA }}
          command: rollout status deployment/scheduling-api -n scheduling
```

## Troubleshooting

Common deployment issues and their solutions:

1. Database connection failures:
   - Check if the database is running and accessible
   - Verify the DATABASE_URL environment variable
   - Check network configuration and firewalls

2. Authentication issues:
   - Validate Auth0 configuration
   - Check token validation and authorization flow
   - Verify client credentials and permissions

3. Performance problems:
   - Monitor resource usage (CPU, memory)
   - Check database query performance
   - Consider scaling up or out in production

4. Container startup failures:
   - Check logs with `docker logs <container_id>`
   - Ensure all required environment variables are set
   - Verify that volume mounts are correctly configured

For additional assistance, refer to the project README or open an issue in the GitHub repository.

---

This guide covers the essential aspects of deploying the Scheduling API in different environments. For specific questions or issues, refer to the project documentation or contact the development team.