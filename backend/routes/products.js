const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const QRCode = require('qrcode');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const logger = require('../config/logger');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('application/') ||
        file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
    }
  },
});

// Validation middleware
const validateAddProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('category')
    .isIn(['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Meat', 'Poultry', 'Seafood', 'Herbs', 'Spices', 'Nuts', 'Seeds', 'Other'])
    .withMessage('Invalid category'),
  body('quantity.value')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('quantity.unit')
    .isIn(['kg', 'g', 'lb', 'oz', 'tons', 'pieces', 'boxes', 'bags', 'liters', 'gallons'])
    .withMessage('Invalid quantity unit'),
  body('farmDetails.farmName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Farm name cannot exceed 100 characters'),
  body('farmDetails.farmLocation.address')
    .trim()
    .notEmpty()
    .withMessage('Farm location is required'),
];

const validateUpdateStatus = [
  body('status')
    .isIn(['Produced', 'InTransit', 'Distributed', 'Retail', 'Sold', 'Recalled'])
    .withMessage('Invalid status'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// @route   POST /api/products
// @desc    Add a new product (Farmer only)
// @access  Private/Farmer
router.post('/', protect, authorize('FARMER'), upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'certificates', maxCount: 3 }
]), validateAddProduct, handleValidationErrors, async (req, res) => {
  try {
    const productData = req.body;
    productData.farmer = req.user._id;
    productData.currentOwner = req.user._id;

    // Upload files to IPFS
    const images = [];
    const documents = [];

    if (req.files.images) {
      for (const file of req.files.images) {
        const ipfsResult = await ipfsService.uploadBuffer(
          file.buffer,
          file.originalname
        );
        images.push({
          hash: ipfsResult.hash,
          description: `Product image: ${file.originalname}`,
          uploadedBy: req.user._id,
        });
      }
    }

    if (req.files.certificates) {
      for (const file of req.files.certificates) {
        const ipfsResult = await ipfsService.uploadBuffer(
          file.buffer,
          file.originalname
        );
        documents.push({
          hash: ipfsResult.hash,
          type: 'Certificate',
          description: `Certificate: ${file.originalname}`,
          uploadedBy: req.user._id,
        });
      }
    }

    // Add product to blockchain first
    const blockchainData = {
      name: productData.name,
      description: productData.description || '',
      location: productData.farmDetails?.farmLocation?.address || '',
      imageHash: images.length > 0 ? images[0].hash : '',
      certificateHash: documents.length > 0 ? documents[0].hash : '',
    };

    const blockchainResult = await blockchainService.addProduct(blockchainData);
    
    // Create product in database
    productData.blockchainId = parseInt(blockchainResult.productId);
    productData.images = images;
    productData.documents = documents;
    
    // Set initial location
    if (productData.farmDetails?.farmLocation) {
      productData.location = {
        current: {
          address: productData.farmDetails.farmLocation.address,
          coordinates: productData.farmDetails.farmLocation.coordinates,
          updatedAt: new Date(),
        },
        history: [],
      };
    }

    const product = await Product.create(productData);
    
    // Generate QR code
    const qrCodeData = JSON.stringify({
      productId: product.blockchainId,
      name: product.name,
      trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${product.blockchainId}`,
    });

    const qrCodeImage = await QRCode.toDataURL(qrCodeData);
    
    // Update product with QR code
    product.qrCode = {
      data: qrCodeData,
      imageUrl: qrCodeImage,
    };
    await product.save();

    // Populate farmer details
    await product.populate('farmer', 'name email profile');

    logger.info(`New product added: ${product.name} (ID: ${product.blockchainId}) by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: {
        product,
        blockchain: blockchainResult,
        qrCode: qrCodeImage,
      },
    });
  } catch (error) {
    logger.error('Add product error:', error);
    
    if (error.message.includes('blockchain')) {
      return res.status(400).json({
        success: false,
        message: 'Blockchain transaction failed',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while adding product',
    });
  }
});

// @route   GET /api/products
// @desc    Get products with filtering and pagination
// @access  Public
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isIn(['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Meat', 'Poultry', 'Seafood', 'Herbs', 'Spices', 'Nuts', 'Seeds', 'Other']),
  query('status').optional().isIn(['Produced', 'InTransit', 'Distributed', 'Retail', 'Sold', 'Recalled']),
  query('farmer').optional().isMongoId().withMessage('Invalid farmer ID'),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.supplyChainStage = req.query.status;
    if (req.query.farmer) filter.farmer = req.query.farmer;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } },
      ];
    }

    // Location-based filtering
    if (req.query.lat && req.query.lng && req.query.radius) {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = parseFloat(req.query.radius) * 1000; // Convert km to meters

      filter['farmDetails.farmLocation.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radius,
        },
      };
    }

    const products = await Product.find(filter)
      .populate('farmer', 'name profile')
      .populate('currentOwner', 'name profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by blockchain ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const blockchainId = parseInt(req.params.id);
    
    if (isNaN(blockchainId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await Product.findOne({ blockchainId })
      .populate('farmer', 'name email profile')
      .populate('currentOwner', 'name profile')
      .populate('images.uploadedBy', 'name')
      .populate('documents.uploadedBy', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get blockchain data
    let blockchainData = null;
    let blockchainHistory = null;
    
    try {
      blockchainData = await blockchainService.getProduct(blockchainId);
      blockchainHistory = await blockchainService.getProductHistory(blockchainId);
    } catch (error) {
      logger.warn(`Failed to fetch blockchain data for product ${blockchainId}:`, error.message);
    }

    res.json({
      success: true,
      data: {
        product,
        blockchain: {
          data: blockchainData,
          history: blockchainHistory,
        },
      },
    });
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
    });
  }
});

// @route   PUT /api/products/:id/status
// @desc    Update product status
// @access  Private (Farmer/Distributor/Retailer based on status)
router.put('/:id/status', protect, validateUpdateStatus, handleValidationErrors, async (req, res) => {
  try {
    const blockchainId = parseInt(req.params.id);
    const { status, location, notes } = req.body;

    if (isNaN(blockchainId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    // Check role permissions
    const allowedRoles = {
      'InTransit': ['FARMER', 'DISTRIBUTOR'],
      'Distributed': ['DISTRIBUTOR'],
      'Retail': ['RETAILER'],
      'Sold': ['RETAILER'],
      'Recalled': ['FARMER', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'],
    };

    if (!allowedRoles[status]?.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to set status '${status}'`,
      });
    }

    const product = await Product.findOne({ blockchainId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Update blockchain first
    const blockchainResult = await blockchainService.updateProductStatus(
      blockchainId,
      status,
      location,
      notes || ''
    );

    // Update database
    product.supplyChainStage = status;
    await product.updateLocation({
      address: location,
      coordinates: req.body.coordinates,
    }, req.user._id);

    // Transfer ownership if needed
    if (status === 'Distributed' || status === 'Retail') {
      product.currentOwner = req.user._id;
    }

    await product.save();

    logger.info(`Product status updated: ${product.name} (ID: ${blockchainId}) -> ${status} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Product status updated successfully',
      data: {
        product,
        blockchain: blockchainResult,
      },
    });
  } catch (error) {
    logger.error('Update product status error:', error);
    
    if (error.message.includes('blockchain') || error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        message: 'Blockchain transaction failed',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating product status',
    });
  }
});

// @route   POST /api/products/:id/transfer
// @desc    Transfer product ownership
// @access  Private
router.post('/:id/transfer', protect, [
  body('newOwnerAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
], handleValidationErrors, async (req, res) => {
  try {
    const blockchainId = parseInt(req.params.id);
    const { newOwnerAddress } = req.body;

    if (isNaN(blockchainId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await Product.findOne({ blockchainId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user is current owner or admin
    if (product.currentOwner.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only the current owner can transfer ownership',
      });
    }

    // Find new owner user
    const newOwner = await User.findOne({ walletAddress: newOwnerAddress });
    
    if (!newOwner) {
      return res.status(404).json({
        success: false,
        message: 'New owner not found with provided wallet address',
      });
    }

    // Transfer on blockchain
    const blockchainResult = await blockchainService.transferOwnership(
      blockchainId,
      newOwnerAddress
    );

    // Update database
    product.currentOwner = newOwner._id;
    await product.save();

    logger.info(`Product ownership transferred: ${product.name} (ID: ${blockchainId}) to ${newOwner.email}`);

    res.json({
      success: true,
      message: 'Ownership transferred successfully',
      data: {
        product,
        newOwner: {
          id: newOwner._id,
          name: newOwner.name,
          email: newOwner.email,
          walletAddress: newOwner.walletAddress,
        },
        blockchain: blockchainResult,
      },
    });
  } catch (error) {
    logger.error('Transfer ownership error:', error);
    
    if (error.message.includes('blockchain')) {
      return res.status(400).json({
        success: false,
        message: 'Blockchain transaction failed',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while transferring ownership',
    });
  }
});

// @route   GET /api/products/:id/qr
// @desc    Get product QR code
// @access  Public
router.get('/:id/qr', async (req, res) => {
  try {
    const blockchainId = parseInt(req.params.id);
    
    if (isNaN(blockchainId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await Product.findOne({ blockchainId }, 'qrCode name');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: product.qrCode,
        productName: product.name,
      },
    });
  } catch (error) {
    logger.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching QR code',
    });
  }
});

// @route   GET /api/products/my/products
// @desc    Get current user's products
// @access  Private
router.get('/my/products', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    
    if (req.user.role === 'FARMER') {
      filter.farmer = req.user._id;
    } else {
      filter.currentOwner = req.user._id;
    }

    const products = await Product.find(filter)
      .populate('farmer', 'name profile')
      .populate('currentOwner', 'name profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    logger.error('Get my products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your products',
    });
  }
});

// @route   GET /api/products/stats
// @desc    Get product statistics
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Product.getStats();
    
    // Get blockchain stats if available
    let blockchainStats = null;
    try {
      blockchainStats = await blockchainService.getContractStats();
    } catch (error) {
      logger.warn('Failed to fetch blockchain stats:', error.message);
    }

    res.json({
      success: true,
      data: {
        database: stats,
        blockchain: blockchainStats,
      },
    });
  } catch (error) {
    logger.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product statistics',
    });
  }
});

module.exports = router;