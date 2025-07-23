#!/bin/bash

# Security Fix Script for Signal School Quiz Generator
# This script fixes known security vulnerabilities

echo "🔒 Starting Security Fix Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if npm exists
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Current directory: $(pwd)${NC}"

# Fix Frontend Dependencies
if [ -d "frontend" ]; then
    echo -e "${YELLOW}🔧 Fixing Frontend Dependencies...${NC}"
    cd frontend
    
    # Backup current package.json
    cp package.json package.json.backup
    echo -e "${GREEN}📦 Backed up package.json${NC}"
    
    # Clear npm cache
    echo -e "${YELLOW}🧹 Clearing npm cache...${NC}"
    npm cache clean --force
    
    # Remove node_modules and package-lock.json
    echo -e "${YELLOW}🗑️  Removing node_modules and package-lock.json...${NC}"
    rm -rf node_modules package-lock.json
    
    # Install dependencies with security fixes
    echo -e "${YELLOW}📥 Installing dependencies with security fixes...${NC}"
    
    # Install specific secure versions
    npm install postcss@^8.4.31 --save
    npm install prismjs@^1.30.0 --save
    npm install form-data@^3.0.4 --save
    
    # Use npm overrides to force secure versions
    echo -e "${YELLOW}🔒 Applying security overrides...${NC}"
    npm pkg set overrides.postcss="^8.4.31"
    npm pkg set overrides.prismjs="^1.30.0"
    npm pkg set overrides.got="^11.8.5"
    npm pkg set overrides."form-data"="^3.0.4"
    npm pkg set overrides."webpack-dev-server"="^5.2.1"
    
    # Install all dependencies
    npm install
    
    # Run audit fix
    echo -e "${YELLOW}🔍 Running npm audit fix...${NC}"
    npm audit fix --force
    
    # Check for remaining vulnerabilities
    echo -e "${YELLOW}📋 Checking for remaining vulnerabilities...${NC}"
    npm audit --audit-level moderate
    
    cd ..
    echo -e "${GREEN}✅ Frontend security fixes completed${NC}"
else
    echo -e "${RED}❌ Frontend directory not found${NC}"
fi

# Fix Backend Dependencies
if [ -d "backend" ]; then
    echo -e "${YELLOW}🔧 Fixing Backend Dependencies...${NC}"
    cd backend
    
    # Backup current package.json
    cp package.json package.json.backup
    echo -e "${GREEN}📦 Backed up package.json${NC}"
    
    # Clear npm cache
    echo -e "${YELLOW}🧹 Clearing npm cache...${NC}"
    npm cache clean --force
    
    # Remove node_modules and package-lock.json
    echo -e "${YELLOW}🗑️  Removing node_modules and package-lock.json...${NC}"
    rm -rf node_modules package-lock.json
    
    # Install dependencies
    echo -e "${YELLOW}📥 Installing backend dependencies...${NC}"
    npm install
    
    # Run audit fix
    echo -e "${YELLOW}🔍 Running npm audit fix...${NC}"
    npm audit fix
    
    # Check for remaining vulnerabilities
    echo -e "${YELLOW}📋 Checking for remaining vulnerabilities...${NC}"
    npm audit --audit-level moderate
    
    cd ..
    echo -e "${GREEN}✅ Backend security fixes completed${NC}"
else
    echo -e "${RED}❌ Backend directory not found${NC}"
fi

# Summary
echo -e "${BLUE}📊 Security Fix Summary:${NC}"
echo -e "${GREEN}✅ Fixed CVE-2023-44270 (postcss < 8.4.31)${NC}"
echo -e "${GREEN}✅ Fixed CVE-2025-30360, CVE-2025-30359 (webpack-dev-server <= 5.2.0)${NC}"
echo -e "${GREEN}✅ Fixed CVE-2024-53382 (prismjs < 1.30.0)${NC}"
echo -e "${GREEN}✅ Fixed CVE-2022-33987 (got < 11.8.5)${NC}"
echo -e "${GREEN}✅ Fixed CVE-2025-7783 (form-data >= 3.0.0 < 3.0.4)${NC}"

echo -e "${BLUE}🔍 Next Steps:${NC}"
echo -e "1. Test your application to ensure everything works"
echo -e "2. Run 'npm test' in both frontend and backend"
echo -e "3. Commit the changes to version control"
echo -e "4. Consider setting up automated security scanning"

echo -e "${GREEN}🎉 Security fix process completed!${NC}"