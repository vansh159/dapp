const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize, authRateLimit } = require('../middleware/auth');
const logger = require('../config/logger');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['FARMER', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER'])
    .withMessage('Invalid role specified'),
  body('walletAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
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

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimit(), validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password, role, walletAddress, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        ...(walletAddress ? [{ walletAddress }] : [])
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
      if (existingUser.walletAddress === walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'User with this wallet address already exists',
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      walletAddress,
      profile: profile || {},
    });

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Register user on blockchain if wallet address is provided
    let blockchainRegistration = null;
    if (walletAddress) {
      try {
        // Upload user profile to IPFS if available
        let profileHash = '';
        if (profile && Object.keys(profile).length > 0) {
          const ipfsResult = await ipfsService.uploadJSON(profile, `profile-${user._id}.json`);
          profileHash = ipfsResult.hash;
        }

        blockchainRegistration = await blockchainService.registerUser(
          walletAddress,
          role,
          profileHash
        );
      } catch (error) {
        logger.warn('Blockchain registration failed:', error.message);
        // Don't fail the entire registration if blockchain fails
      }
    }

    logger.info(`New user registered: ${email} (${role})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token,
        blockchainRegistration,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or wallet address already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimit(), validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked due to multiple failed login attempts',
        lockUntil: user.lockUntil,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = user.getSignedJwtToken();

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('verificationDocuments');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
          profile: user.profile,
          isActive: user.isActive,
          isVerified: user.isVerified,
          verificationDocuments: user.verificationDocuments,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, profile, walletAddress } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (profile) updateData.profile = { ...req.user.profile, ...profile };
    if (walletAddress && walletAddress !== req.user.walletAddress) {
      // Check if wallet address is already taken
      const existingUser = await User.findOne({ walletAddress, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is already associated with another account',
        });
      }
      updateData.walletAddress = walletAddress;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
          profile: user.profile,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, (req, res) => {
  // Clear cookie if using cookie-based auth
  res.clearCookie('token');
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @route   GET /api/auth/verify-token
// @desc    Verify JWT token
// @access  Private
router.get('/verify-token', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
      },
    },
  });
});

// @route   GET /api/auth/stats
// @desc    Get user statistics (Admin only)
// @access  Private/Admin
router.get('/stats', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const stats = await User.getStats();

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics',
    });
  }
});

module.exports = router;