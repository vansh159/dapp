const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    this.rpcUrl = process.env.RPC_URL;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize provider
      if (this.rpcUrl) {
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      } else {
        logger.warn('No RPC URL provided, using default localhost');
        this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      }

      // Initialize signer if private key is provided
      if (this.privateKey) {
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
        logger.info('Blockchain service initialized with signer');
      } else {
        logger.warn('No private key provided, read-only mode');
      }

      // Load contract ABI and initialize contract
      await this.loadContract();

      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);

    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async loadContract() {
    try {
      let contractABI;
      
      // Try to load from deployments directory first
      const deploymentPath = path.join(__dirname, '../../deployments/SupplyChain-abi.json');
      if (fs.existsSync(deploymentPath)) {
        contractABI = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      } else {
        // Fallback to artifacts directory
        const artifactPath = path.join(__dirname, '../../artifacts/contracts/SupplyChain.sol/SupplyChain.json');
        if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          contractABI = artifact.abi;
        } else {
          throw new Error('Contract ABI not found. Please compile and deploy the contract first.');
        }
      }

      if (!this.contractAddress) {
        throw new Error('Contract address not provided in environment variables');
      }

      // Initialize contract instance
      this.contract = new ethers.Contract(
        this.contractAddress,
        contractABI,
        this.signer || this.provider
      );

      logger.info(`Contract initialized at address: ${this.contractAddress}`);
    } catch (error) {
      logger.error('Failed to load contract:', error);
      throw error;
    }
  }

  // Product Management Functions
  async addProduct(productData) {
    try {
      if (!this.signer) {
        throw new Error('No signer available. Cannot perform write operations.');
      }

      const { name, description, location, imageHash, certificateHash } = productData;

      const tx = await this.contract.addProduct(
        name,
        description,
        location,
        imageHash || '',
        certificateHash || ''
      );

      logger.info(`Product creation transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      // Extract product ID from event logs
      const productAddedEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id('ProductAdded(uint256,string,address,string,uint256)')
      );

      if (productAddedEvent) {
        const decodedLog = this.contract.interface.parseLog(productAddedEvent);
        const productId = decodedLog.args.productId;
        
        logger.info(`Product added successfully with ID: ${productId}`);
        return {
          success: true,
          productId: productId.toString(),
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
        };
      }

      throw new Error('Product creation event not found in transaction receipt');
    } catch (error) {
      logger.error('Failed to add product to blockchain:', error);
      throw error;
    }
  }

  async updateProductStatus(productId, newStatus, location, notes) {
    try {
      if (!this.signer) {
        throw new Error('No signer available. Cannot perform write operations.');
      }

      // Convert status string to enum value
      const statusMap = {
        'Produced': 0,
        'InTransit': 1,
        'Distributed': 2,
        'Retail': 3,
        'Sold': 4,
        'Recalled': 5
      };

      const statusValue = statusMap[newStatus];
      if (statusValue === undefined) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const tx = await this.contract.updateProductStatus(
        productId,
        statusValue,
        location,
        notes || ''
      );

      logger.info(`Product status update transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to update product status:', error);
      throw error;
    }
  }

  async transferOwnership(productId, newOwnerAddress) {
    try {
      if (!this.signer) {
        throw new Error('No signer available. Cannot perform write operations.');
      }

      const tx = await this.contract.transferOwnership(productId, newOwnerAddress);
      
      logger.info(`Ownership transfer transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to transfer ownership:', error);
      throw error;
    }
  }

  // Query Functions
  async getProduct(productId) {
    try {
      const product = await this.contract.getProduct(productId);
      
      // Convert BigInt values to strings for JSON serialization
      return {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        currentOwner: product.currentOwner,
        farmer: product.farmer,
        status: this.getStatusString(product.status),
        location: product.location,
        createdAt: new Date(Number(product.createdAt) * 1000),
        updatedAt: new Date(Number(product.updatedAt) * 1000),
        imageHash: product.imageHash,
        certificateHash: product.certificateHash,
        exists: product.exists,
      };
    } catch (error) {
      logger.error(`Failed to get product ${productId}:`, error);
      throw error;
    }
  }

  async getProductHistory(productId) {
    try {
      const history = await this.contract.getProductHistory(productId);
      
      return history.map(entry => ({
        actor: entry.actor,
        status: this.getStatusString(entry.status),
        location: entry.location,
        timestamp: new Date(Number(entry.timestamp) * 1000),
        notes: entry.notes,
      }));
    } catch (error) {
      logger.error(`Failed to get product history for ${productId}:`, error);
      throw error;
    }
  }

  async getProductsByFarmer(farmerAddress) {
    try {
      const productIds = await this.contract.getProductsByFarmer(farmerAddress);
      return productIds.map(id => id.toString());
    } catch (error) {
      logger.error(`Failed to get products by farmer ${farmerAddress}:`, error);
      throw error;
    }
  }

  async getProductsByOwner(ownerAddress) {
    try {
      const productIds = await this.contract.getProductsByOwner(ownerAddress);
      return productIds.map(id => id.toString());
    } catch (error) {
      logger.error(`Failed to get products by owner ${ownerAddress}:`, error);
      throw error;
    }
  }

  async getContractStats() {
    try {
      const stats = await this.contract.getStats();
      
      return {
        totalProducts: stats._totalProducts.toString(),
        producedCount: stats._producedCount.toString(),
        inTransitCount: stats._inTransitCount.toString(),
        distributedCount: stats._distributedCount.toString(),
        retailCount: stats._retailCount.toString(),
        soldCount: stats._soldCount.toString(),
      };
    } catch (error) {
      logger.error('Failed to get contract stats:', error);
      throw error;
    }
  }

  // User Management Functions
  async registerUser(userAddress, role, profileHash) {
    try {
      if (!this.signer) {
        throw new Error('No signer available. Cannot perform write operations.');
      }

      const tx = await this.contract.registerUser(userAddress, role, profileHash || '');
      
      logger.info(`User registration transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to register user on blockchain:', error);
      throw error;
    }
  }

  async hasUserRole(role, userAddress) {
    try {
      const roleBytes = ethers.keccak256(ethers.toUtf8Bytes(`${role}_ROLE`));
      return await this.contract.hasUserRole(roleBytes, userAddress);
    } catch (error) {
      logger.error(`Failed to check user role for ${userAddress}:`, error);
      throw error;
    }
  }

  async getUserProfile(userAddress) {
    try {
      return await this.contract.getUserProfile(userAddress);
    } catch (error) {
      logger.error(`Failed to get user profile for ${userAddress}:`, error);
      throw error;
    }
  }

  // Utility Functions
  getStatusString(statusValue) {
    const statusMap = {
      0: 'Produced',
      1: 'InTransit',
      2: 'Distributed',
      3: 'Retail',
      4: 'Sold',
      5: 'Recalled'
    };
    return statusMap[statusValue] || 'Unknown';
  }

  async getBlockNumber() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Failed to get block number:', error);
      throw error;
    }
  }

  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      return {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      };
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      throw error;
    }
  }

  // Event Listening
  async listenToEvents(eventName, callback) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      this.contract.on(eventName, callback);
      logger.info(`Started listening to ${eventName} events`);
    } catch (error) {
      logger.error(`Failed to listen to ${eventName} events:`, error);
      throw error;
    }
  }

  stopListeningToEvents(eventName) {
    try {
      if (this.contract) {
        this.contract.removeAllListeners(eventName);
        logger.info(`Stopped listening to ${eventName} events`);
      }
    } catch (error) {
      logger.error(`Failed to stop listening to ${eventName} events:`, error);
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;