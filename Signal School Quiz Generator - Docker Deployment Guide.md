## 🐳 Docker Deployment Instructions

### Prerequisites
- Docker
- Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/signal-school-quiz-generator.git
cd signal-school-quiz-generator
```

### 2. Prepare Environment Files

#### Create Secrets Directory
```bash
mkdir -p secrets
```

#### Generate Secure Secrets
```bash
# Generate secure random passwords
echo $(openssl rand -base64 12) > secrets/db_root_password
echo $(openssl rand -base64 12) > secrets/db_user
echo $(openssl rand -base64 12) > secrets/db_password
```

#### Create Environment Files
##### Backend `.env.production`
```bash
cat << EOF > backend/.env.production
DB_HOST=database
DB_USER=quiz_app_user
DB_PASSWORD=$(cat secrets/db_password)
DB_NAME=quiz_generator

GOOGLE_GEMINI_API_KEY=your_production_api_key

PORT=5000
NODE_ENV=production

CORS_ORIGIN=http://localhost
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

##### Frontend `.env.production`
```bash
cat << EOF > frontend/.env.production
REACT_APP_API_URL=http://localhost:5000/api
EOF
```

### 3. Build and Run Docker Containers

#### Development Mode
```bash
# Build images
docker-compose -f docker-compose.yml build

# Start containers
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f
```

#### Production Mode
```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4. Database Initialization
```bash
# Run database migrations
docker-compose exec backend bun run db:migrate

# Seed initial data (if applicable)
docker-compose exec backend bun run db:seed
```

### 5. Accessing the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Adminer (Database Management): http://localhost:8080

### Useful Docker Commands

#### Stop Containers
```bash
docker-compose down
```

#### Rebuild Specific Service
```bash
docker-compose build backend
docker-compose up -d backend
```

#### Remove All Containers and Images
```bash
# Careful: This will remove ALL docker containers and images
docker-compose down --rmi all --volumes
```

### Troubleshooting

#### Common Issues
1. Port Conflicts
   - Ensure no other services are using ports 3000, 5000, 3306
   
2. Permission Issues
   ```bash
   # Fix permission issues
   sudo chown -R $USER:$USER .
   ```

3. Rebuild from Scratch
   ```bash
   docker-compose down --rmi all
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Security Recommendations
- Regularly rotate secrets
- Use strong, unique passwords
- Keep Docker and dependencies updated
- Implement network segmentation

### Monitoring
```bash
# View container logs
docker-compose logs -f

# Monitor resource usage
docker stats
```

## 🚀 Deployment Workflow

1. Develop locally
2. Commit changes
3. Push to repository
4. GitHub Actions builds and tests
5. Deploy to production server

## 📝 Notes
- Customize `.env.production` with your actual production values
- Always use strong, unique secrets
- Never commit sensitive information to version control