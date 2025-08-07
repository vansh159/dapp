#!/bin/bash

# ==============================================
# BLOCKCHAIN-BASED SUPPLY CHAIN MANAGEMENT SYSTEM
# Production Deployment Script
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="agrichain"
DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if required commands exist
    local commands=("node" "npm" "git" "docker" "docker-compose")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="18.0.0"
    
    if ! npx semver $NODE_VERSION -r ">=$REQUIRED_NODE_VERSION" &> /dev/null; then
        print_error "Node.js version $REQUIRED_NODE_VERSION or higher is required (current: $NODE_VERSION)"
        exit 1
    fi
    
    print_status "All prerequisites met"
}

# Setup environment
setup_environment() {
    print_header "Setting Up Environment"
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your actual configuration before continuing"
        read -p "Press Enter after editing .env file..."
    fi
    
    # Source environment variables
    source .env
    
    # Validate required environment variables
    local required_vars=("MONGODB_URI" "JWT_SECRET" "CONTRACT_ADDRESS" "PRIVATE_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_status "Environment setup complete"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_status "Dependencies installed successfully"
}

# Build application
build_application() {
    print_header "Building Application"
    
    # Compile smart contracts
    print_status "Compiling smart contracts..."
    npm run compile
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    print_status "Application built successfully"
}

# Deploy smart contracts
deploy_contracts() {
    print_header "Deploying Smart Contracts"
    
    local network=${1:-"localhost"}
    
    print_status "Deploying to network: $network"
    
    if [[ "$network" == "localhost" ]]; then
        # Start local blockchain if not running
        if ! pgrep -f "hardhat node" > /dev/null; then
            print_status "Starting local Hardhat network..."
            npm run node &
            sleep 5
        fi
    fi
    
    # Deploy contracts
    npm run deploy:$network
    
    # Update contract addresses in environment
    if [[ -f "deployments/contract-addresses.json" ]]; then
        CONTRACT_ADDR=$(cat deployments/contract-addresses.json | jq -r '.contractAddress')
        sed -i "s/CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=$CONTRACT_ADDR/" .env
        sed -i "s/VITE_CONTRACT_ADDRESS=.*/VITE_CONTRACT_ADDRESS=$CONTRACT_ADDR/" .env
        print_status "Contract address updated in .env file"
    fi
    
    print_status "Smart contracts deployed successfully"
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    if [[ "$NODE_ENV" == "production" ]]; then
        print_status "Database setup for production environment"
        # Add production database setup logic here
    else
        print_status "Database setup for development environment"
        # Check if MongoDB is running
        if ! pgrep mongod > /dev/null; then
            print_warning "MongoDB is not running. Please start MongoDB service"
        fi
    fi
    
    print_status "Database setup complete"
}

# Setup IPFS
setup_ipfs() {
    print_header "Setting Up IPFS"
    
    if [[ "$NODE_ENV" == "production" ]]; then
        print_status "Using hosted IPFS service for production"
    else
        # Check if IPFS is running locally
        if ! pgrep ipfs > /dev/null; then
            print_warning "IPFS daemon is not running"
            print_status "Starting IPFS daemon..."
            ipfs daemon &
            sleep 3
        fi
    fi
    
    print_status "IPFS setup complete"
}

# Setup SSL certificates
setup_ssl() {
    print_header "Setting Up SSL Certificates"
    
    if [[ "$NODE_ENV" != "production" ]]; then
        print_status "Skipping SSL setup for non-production environment"
        return
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        print_status "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Generate SSL certificate
    print_status "Generating SSL certificate for $DOMAIN"
    sudo certbot certonly --standalone -d $DOMAIN -d api.$DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    print_status "SSL certificates generated successfully"
}

# Setup reverse proxy (Nginx)
setup_nginx() {
    print_header "Setting Up Nginx Reverse Proxy"
    
    if [[ "$NODE_ENV" != "production" ]]; then
        print_status "Skipping Nginx setup for non-production environment"
        return
    fi
    
    # Install Nginx if not present
    if ! command -v nginx &> /dev/null; then
        print_status "Installing Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$PROJECT_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    location / {
        root /var/www/$PROJECT_NAME;
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    sudo nginx -t
    sudo systemctl reload nginx
    
    print_status "Nginx configured successfully"
}

# Deploy frontend
deploy_frontend() {
    print_header "Deploying Frontend"
    
    if [[ "$NODE_ENV" == "production" ]]; then
        # Copy built files to web server directory
        sudo mkdir -p /var/www/$PROJECT_NAME
        sudo cp -r frontend/dist/* /var/www/$PROJECT_NAME/
        sudo chown -R www-data:www-data /var/www/$PROJECT_NAME
        print_status "Frontend deployed to /var/www/$PROJECT_NAME"
    else
        print_status "Frontend built for development environment"
    fi
}

# Setup systemd service for backend
setup_backend_service() {
    print_header "Setting Up Backend Service"
    
    if [[ "$NODE_ENV" != "production" ]]; then
        print_status "Skipping systemd service setup for non-production environment"
        return
    fi
    
    # Create systemd service file
    sudo tee /etc/systemd/system/$PROJECT_NAME-backend.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable $PROJECT_NAME-backend
    sudo systemctl start $PROJECT_NAME-backend
    
    print_status "Backend service configured and started"
}

# Setup monitoring
setup_monitoring() {
    print_header "Setting Up Monitoring"
    
    if [[ "$NODE_ENV" != "production" ]]; then
        print_status "Skipping monitoring setup for non-production environment"
        return
    fi
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOF
/home/$USER/$PROJECT_NAME/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
    
    print_status "Monitoring and logging configured"
}

# Setup firewall
setup_firewall() {
    print_header "Setting Up Firewall"
    
    if [[ "$NODE_ENV" != "production" ]]; then
        print_status "Skipping firewall setup for non-production environment"
        return
    fi
    
    # Configure UFW
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw --force enable
    
    print_status "Firewall configured successfully"
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    # Run smart contract tests
    print_status "Running smart contract tests..."
    npm run test
    
    # Run backend tests
    print_status "Running backend tests..."
    cd backend
    npm test
    cd ..
    
    print_status "All tests passed successfully"
}

# Backup current deployment
backup_deployment() {
    print_header "Creating Backup"
    
    local backup_dir="/tmp/${PROJECT_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p $backup_dir
    
    # Backup database
    if command -v mongodump &> /dev/null; then
        print_status "Backing up database..."
        mongodump --uri="$MONGODB_URI" --out="$backup_dir/database"
    fi
    
    # Backup configuration
    cp .env "$backup_dir/"
    
    print_status "Backup created at $backup_dir"
}

# Health check
health_check() {
    print_header "Running Health Check"
    
    # Check backend API
    if [[ "$NODE_ENV" == "production" ]]; then
        local api_url="https://api.$DOMAIN/health"
    else
        local api_url="http://localhost:5000/health"
    fi
    
    print_status "Checking backend API at $api_url"
    if curl -f -s "$api_url" > /dev/null; then
        print_status "Backend API is healthy"
    else
        print_error "Backend API health check failed"
        return 1
    fi
    
    # Check database connection
    print_status "Checking database connection..."
    cd backend
    if node -e "
        const mongoose = require('mongoose');
        mongoose.connect('$MONGODB_URI', { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => { console.log('Database connected'); process.exit(0); })
        .catch(() => { console.log('Database connection failed'); process.exit(1); });
    "; then
        print_status "Database connection is healthy"
    else
        print_error "Database connection failed"
        return 1
    fi
    cd ..
    
    print_status "Health check completed successfully"
}

# Main deployment function
deploy() {
    local environment=${1:-"development"}
    local skip_tests=${2:-"false"}
    
    print_header "Starting Deployment - Environment: $environment"
    
    # Set NODE_ENV
    export NODE_ENV=$environment
    
    # Run deployment steps
    check_root
    check_prerequisites
    setup_environment
    
    if [[ "$skip_tests" != "true" ]]; then
        run_tests
    fi
    
    backup_deployment
    install_dependencies
    build_application
    deploy_contracts $BLOCKCHAIN_NETWORK
    setup_database
    setup_ipfs
    
    if [[ "$environment" == "production" ]]; then
        setup_ssl
        setup_nginx
        setup_backend_service
        setup_monitoring
        setup_firewall
    fi
    
    deploy_frontend
    
    # Wait a moment for services to start
    sleep 5
    
    health_check
    
    print_header "Deployment Completed Successfully!"
    
    if [[ "$environment" == "production" ]]; then
        print_status "Frontend: https://$DOMAIN"
        print_status "Backend API: https://api.$DOMAIN"
    else
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:5000"
    fi
    
    print_status "Smart Contract Address: $CONTRACT_ADDRESS"
}

# Script usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  development  Deploy for development (default)"
    echo "  production   Deploy for production"
    echo ""
    echo "OPTIONS:"
    echo "  --skip-tests  Skip running tests"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy for development"
    echo "  $0 production               # Deploy for production"
    echo "  $0 development --skip-tests # Deploy without tests"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        usage
        exit 0
        ;;
    production|development|"")
        ENVIRONMENT=${1:-"development"}
        SKIP_TESTS="false"
        
        if [[ "${2:-}" == "--skip-tests" ]]; then
            SKIP_TESTS="true"
        fi
        
        deploy $ENVIRONMENT $SKIP_TESTS
        ;;
    *)
        print_error "Invalid argument: $1"
        usage
        exit 1
        ;;
esac