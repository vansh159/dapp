# 🌾 Agricultural Supply Chain Management System

A comprehensive blockchain-based supply chain management system for agricultural products, providing complete traceability from farm to consumer.

## 🔷 Overview

This system enables transparent tracking of agricultural products through their entire supply chain journey using blockchain technology, IPFS for decentralized storage, and modern web technologies.

### Key Features

- **🔗 Blockchain Integration**: Ethereum-based smart contracts for immutable product tracking
- **👥 Role-Based Access**: Farmer, Distributor, Retailer, Consumer, and Admin roles
- **📱 QR Code Tracking**: Easy product verification through QR codes
- **🗂️ IPFS Storage**: Decentralized storage for product images and certificates
- **📊 Real-time Analytics**: Dashboard with supply chain statistics
- **🔐 Secure Authentication**: JWT-based authentication with wallet integration
- **📍 Location Tracking**: GPS-based location tracking throughout the supply chain
- **📄 Document Management**: Upload and verify certificates and quality documents

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│   (React.js)    │◄──►│   (Node.js)     │◄──►│   (Ethereum)    │
│                 │    │                 │    │                 │
│ - User Interface│    │ - REST APIs     │    │ - Smart Contract│
│ - Web3 Integration   │ - Authentication│    │ - Product Data  │
│ - QR Scanner    │    │ - File Upload   │    │ - History       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Database     │    │      IPFS       │
                       │   (MongoDB)     │    │   (Distributed) │
                       │                 │    │                 │
                       │ - User Data     │    │ - Images        │
                       │ - Product Meta  │    │ - Documents     │
                       │ - Analytics     │    │ - Certificates  │
                       └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** - Smart contract development
- **Hardhat** - Development framework
- **OpenZeppelin** - Security and access control
- **Ethers.js** - Blockchain interaction

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **JWT** - Authentication
- **Multer** - File upload handling
- **Winston** - Logging

### Frontend
- **React.js** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **React Query** - State management
- **Ethers.js** - Web3 integration

### Infrastructure
- **IPFS** - Decentralized storage
- **Docker** - Containerization
- **MongoDB Atlas** - Cloud database (production)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/agricultural-supply-chain.git
   cd agricultural-supply-chain
   ```

2. **Install smart contract dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Setup

1. **Smart Contract Environment**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   PRIVATE_KEY=your_wallet_private_key
   INFURA_PROJECT_ID=your_infura_project_id
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

2. **Backend Environment**
   ```bash
   cd backend
   cp .env.example .env
   
   # Configure your environment variables
   MONGODB_URI=mongodb://localhost:27017/agricultural-supply-chain
   JWT_SECRET=your-super-secret-jwt-key
   CONTRACT_ADDRESS=deployed_contract_address
   ```

3. **Frontend Environment**
   ```bash
   cd frontend
   cp .env.example .env
   
   # Configure your environment variables
   VITE_API_URL=http://localhost:5000/api
   VITE_CONTRACT_ADDRESS=deployed_contract_address
   ```

### Running the Application

#### Option 1: Using Docker (Recommended)

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Deploy smart contract**
   ```bash
   npm run deploy:local
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - IPFS Gateway: http://localhost:8080

#### Option 2: Manual Setup

1. **Start MongoDB and IPFS** (install separately)

2. **Deploy smart contract**
   ```bash
   # Start local Hardhat node
   npx hardhat node
   
   # Deploy contract (in another terminal)
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Start backend**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```

## 📋 Usage Guide

### User Roles and Permissions

#### 🌾 Farmer
- Add new products to the supply chain
- Upload product images and certificates
- Update product status to "In Transit"
- View their product history

#### 🚛 Distributor
- Receive products from farmers
- Update status to "Distributed"
- Transfer ownership to retailers
- Track products in their custody

#### 🏪 Retailer
- Receive products from distributors
- Update status to "Retail" and "Sold"
- Manage inventory
- Serve end consumers

#### 👤 Consumer
- Track any product using ID or QR code
- View complete product history
- Verify authenticity
- Access product certificates

#### 👨‍💼 Admin
- Manage user accounts
- View system analytics
- Handle disputes
- System configuration

### Product Lifecycle

```
[Farmer] → [In Transit] → [Distributor] → [Retail] → [Consumer]
    ↓           ↓              ↓           ↓           ↓
  Created   Shipping      Warehouse    Store      Purchased
```

### QR Code Tracking

1. **Generate QR Code**: Automatically created when product is added
2. **Scan QR Code**: Use any QR scanner or the built-in scanner
3. **View History**: Complete supply chain journey with timestamps
4. **Verify Authenticity**: Blockchain-verified information

## 🔧 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/profile
POST /api/auth/logout
```

### Product Endpoints

```http
GET    /api/products              # Get all products
POST   /api/products              # Add new product (Farmer only)
GET    /api/products/:id          # Get product details
PUT    /api/products/:id/status   # Update product status
POST   /api/products/:id/transfer # Transfer ownership
GET    /api/products/:id/qr       # Get QR code
```

### Upload Endpoints

```http
POST /api/upload                  # Upload file to IPFS
```

## 🔐 Smart Contract Functions

### Core Functions

```solidity
// Add new product
function addProduct(
    string memory _name,
    string memory _description,
    string memory _location,
    string memory _imageHash,
    string memory _certificateHash
) external returns (uint256)

// Update product status
function updateProductStatus(
    uint256 _productId,
    ProductStatus _newStatus,
    string memory _location,
    string memory _notes
) external

// Transfer ownership
function transferOwnership(
    uint256 _productId,
    address _newOwner
) external

// Get product details
function getProduct(uint256 _productId) 
    external view returns (Product memory)

// Get product history
function getProductHistory(uint256 _productId) 
    external view returns (HistoryEntry[] memory)
```

## 🧪 Testing

### Smart Contract Tests

```bash
# Run smart contract tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🚀 Deployment

### Smart Contract Deployment

#### Testnet Deployment (Goerli)

```bash
# Deploy to Goerli testnet
npm run deploy:goerli

# Verify contract
npm run verify:goerli <CONTRACT_ADDRESS>
```

#### Mainnet Deployment

```bash
# Deploy to mainnet (use with caution)
npm run deploy:mainnet

# Verify contract
npm run verify:mainnet <CONTRACT_ADDRESS>
```

### Backend Deployment

#### Using Railway/Render

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

#### Using AWS/DigitalOcean

```bash
# Build and deploy using Docker
docker build -t agricultural-backend ./backend
docker run -p 5000:5000 agricultural-backend
```

### Frontend Deployment

#### Using Vercel

```bash
cd frontend
npm run build
npx vercel --prod
```

#### Using Netlify

```bash
cd frontend
npm run build
# Upload dist folder to Netlify
```

## 🔒 Security Considerations

### Smart Contract Security

- ✅ Role-based access control implemented
- ✅ Reentrancy protection using OpenZeppelin
- ✅ Input validation and sanitization
- ✅ Emergency pause functionality
- ✅ Upgrade patterns considered

### Backend Security

- ✅ JWT token authentication
- ✅ Rate limiting implemented
- ✅ Input validation and sanitization
- ✅ CORS properly configured
- ✅ Helmet.js for security headers
- ✅ File upload restrictions

### Frontend Security

- ✅ XSS protection
- ✅ CSRF protection
- ✅ Secure token storage
- ✅ Input sanitization
- ✅ Content Security Policy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write comprehensive tests
- Update documentation
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### MetaMask Connection Issues
```bash
# Ensure MetaMask is installed and connected to the correct network
# Check if the contract address is correctly configured
```

#### IPFS Upload Failures
```bash
# Verify IPFS node is running
# Check IPFS configuration in backend
```

#### Database Connection Issues
```bash
# Verify MongoDB is running
# Check connection string in .env
```

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For support and questions:

- 📧 Email: support@agriculturechain.com
- 💬 Discord: [Join our community](https://discord.gg/agricultural-chain)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/agricultural-supply-chain/issues)

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Basic supply chain tracking
- ✅ Role-based access control
- ✅ QR code generation and scanning
- ✅ IPFS integration

### Phase 2 (Planned)
- 🔄 Mobile application
- 🔄 Advanced analytics dashboard
- 🔄 IoT sensor integration
- 🔄 Multi-language support

### Phase 3 (Future)
- 🔄 AI-powered quality prediction
- 🔄 Carbon footprint tracking
- 🔄 Integration with existing ERP systems
- 🔄 Marketplace functionality

## 🙏 Acknowledgments

- OpenZeppelin for smart contract security patterns
- The Ethereum community for blockchain infrastructure
- IPFS for decentralized storage solutions
- All contributors who helped build this system

---

**Built with ❤️ for sustainable agriculture and transparent supply chains**