const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const custodialWalletService = require('../services/custodialWalletService');
const encryptionService = require('../services/encryptionService');

const router = express.Router();

/**
 * @route   POST /api/user/register
 * @desc    Register a new user with custodial wallet
 * @access  Public
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email address already exists. Please try logging in instead.',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    // Generate custodial wallet
    const custodialWallet = custodialWalletService.generateCustodialWallet();

    console.log('custodialWallet', custodialWallet);
    const encryptedPrivateKey = encryptionService.encrypt(custodialWallet.privateKey);
    const encryptedMnemonic = encryptionService.encrypt(custodialWallet.mnemonic);

    const decryptedPrivateKey = encryptionService.decrypt(encryptedPrivateKey);
    const decryptedMnemonic = encryptionService.decrypt(encryptedMnemonic);
    

    console.log('decryptedPrivateKey', decryptedPrivateKey);
    console.log('decryptedMnemonic', decryptedMnemonic);
    console.log('encryptedPrivateKey', encryptedPrivateKey);
    console.log('encryptedMnemonic', encryptedMnemonic);

    // Create user
    const user = await User.create({
      email,
      password,
      custodial_wallet_address: custodialWallet.address,
      custodial_wallet_private_key: custodialWallet.privateKey,
      custodial_wallet_mnemonic: custodialWallet.mnemonic
    });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/user/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No account exists with this email address. Please check your email or register for a new account.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support for assistance.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'The password you entered is incorrect. Please try again.',
        code: 'INVALID_PASSWORD'
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * @route   POST /api/user/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Fetch user with password field for comparison
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * @route   GET /api/user/wallet
 * @desc    Get user's custodial wallet info
 * @access  Private
 */
router.get('/wallet', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        wallet: {
          address: user.custodial_wallet_address
        }
      }
    });

  } catch (error) {
    console.error('Wallet info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet info'
    });
  }
});

module.exports = router;
