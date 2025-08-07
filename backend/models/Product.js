const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  blockchainId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    maxlength: [100, 'Product name cannot be more than 100 characters'],
    trim: true,
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
  },
  category: {
    type: String,
    enum: [
      'Fruits',
      'Vegetables',
      'Grains',
      'Dairy',
      'Meat',
      'Poultry',
      'Seafood',
      'Herbs',
      'Spices',
      'Nuts',
      'Seeds',
      'Other'
    ],
    required: true,
  },
  variety: {
    type: String,
    maxlength: [50, 'Variety cannot be more than 50 characters'],
  },
  quantity: {
    value: {
      type: Number,
      required: true,
      min: [0, 'Quantity must be positive'],
    },
    unit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'oz', 'tons', 'pieces', 'boxes', 'bags', 'liters', 'gallons'],
      required: true,
    },
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  farmDetails: {
    farmName: String,
    farmLocation: {
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    farmingMethod: {
      type: String,
      enum: ['Organic', 'Conventional', 'Hydroponic', 'Greenhouse', 'Free-range'],
    },
    certifications: [{
      type: String,
      name: String,
      issuedBy: String,
      validUntil: Date,
    }],
  },
  productionDetails: {
    harvestDate: Date,
    plantingDate: Date,
    expectedShelfLife: Number, // in days
    storageRequirements: String,
    processingDate: Date,
  },
  qualityMetrics: {
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C'],
    },
    freshness: {
      type: Number,
      min: 1,
      max: 10,
    },
    appearance: {
      type: Number,
      min: 1,
      max: 10,
    },
    testResults: [{
      testType: String,
      result: String,
      testedBy: String,
      testDate: Date,
      certificateHash: String, // IPFS hash
    }],
  },
  images: [{
    hash: {
      type: String,
      required: true,
    },
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  documents: [{
    hash: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Certificate', 'Test Result', 'Invoice', 'Shipping Document', 'Other'],
      required: true,
    },
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  pricing: {
    basePrice: {
      type: Number,
      min: [0, 'Price must be positive'],
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'ETH'],
    },
    priceHistory: [{
      price: Number,
      currency: String,
      updatedAt: Date,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
  },
  supplyChainStage: {
    type: String,
    enum: ['Produced', 'InTransit', 'Distributed', 'Retail', 'Sold', 'Recalled'],
    default: 'Produced',
  },
  location: {
    current: {
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      updatedAt: Date,
    },
    history: [{
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      timestamp: Date,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
  },
  qrCode: {
    data: String,
    imageUrl: String, // Generated QR code image
  },
  sustainability: {
    carbonFootprint: Number, // kg CO2 equivalent
    waterUsage: Number, // liters
    energyUsage: Number, // kWh
    sustainabilityScore: {
      type: Number,
      min: 1,
      max: 100,
    },
    certifications: [String], // Sustainability certifications
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  tags: [String], // For search and categorization
  metadata: {
    type: Map,
    of: String, // Additional flexible metadata
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
ProductSchema.index({ blockchainId: 1 });
ProductSchema.index({ farmer: 1 });
ProductSchema.index({ currentOwner: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ supplyChainStage: 1 });
ProductSchema.index({ 'farmDetails.farmLocation.coordinates': '2dsphere' });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ createdAt: -1 });

// Virtual for product age
ProductSchema.virtual('ageInDays').get(function() {
  if (this.productionDetails.harvestDate) {
    const now = new Date();
    const harvestDate = new Date(this.productionDetails.harvestDate);
    const diffTime = Math.abs(now - harvestDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for estimated expiry
ProductSchema.virtual('estimatedExpiry').get(function() {
  if (this.productionDetails.harvestDate && this.productionDetails.expectedShelfLife) {
    const harvestDate = new Date(this.productionDetails.harvestDate);
    const expiryDate = new Date(harvestDate.getTime() + (this.productionDetails.expectedShelfLife * 24 * 60 * 60 * 1000));
    return expiryDate;
  }
  return null;
});

// Method to add location history
ProductSchema.methods.updateLocation = function(newLocation, updatedBy) {
  if (!this.location.history) {
    this.location.history = [];
  }
  
  // Add current location to history before updating
  if (this.location.current) {
    this.location.history.push({
      ...this.location.current,
      timestamp: this.location.current.updatedAt || new Date(),
      updatedBy: updatedBy,
    });
  }
  
  // Update current location
  this.location.current = {
    ...newLocation,
    updatedAt: new Date(),
  };
  
  return this.save();
};

// Static method to get products by location radius
ProductSchema.statics.findByLocation = function(coordinates, radiusInKm = 10) {
  return this.find({
    'farmDetails.farmLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        },
        $maxDistance: radiusInKm * 1000, // Convert to meters
      },
    },
  });
};

// Static method to get product statistics
ProductSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$pricing.basePrice' },
        totalQuantity: { $sum: '$quantity.value' },
      },
    },
  ]);

  const stageStats = await this.aggregate([
    {
      $group: {
        _id: '$supplyChainStage',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalProducts = await this.countDocuments();
  const activeProducts = await this.countDocuments({ isActive: true });

  return {
    total: totalProducts,
    active: activeProducts,
    byCategory: stats,
    byStage: stageStats,
  };
};

// Pre-save middleware to generate QR code data
ProductSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('blockchainId')) {
    // Generate QR code data with product tracking URL
    this.qrCode.data = JSON.stringify({
      productId: this.blockchainId,
      name: this.name,
      trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${this.blockchainId}`,
    });
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);