const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, checkBalance } = require('../middleware/auth');
const custodialWalletService = require('../services/custodialWalletService');
const encryptionService = require('../services/encryptionService');

const router = express.Router();

/**
 * @route   GET /api/wallet/balance
 * @desc    Get user's token balance
 * @access  Private
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    
    if (!tokenContractAddress) {
      return res.status(500).json({
        success: false,
        error: 'Token contract not configured'
      });
    }

    const balance = await custodialWalletService.getTokenBalance(
      user.custodial_wallet_address,
      tokenContractAddress
    );

    res.json({
      success: true,
      data: {
        balance: balance,
        wallet: user.custodial_wallet_address,
        tokenContract: tokenContractAddress
      }
    });

  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
});

/**
 * @route   GET /api/wallet/native-balance
 * @desc    Get user's native token balance (KDA)
 * @access  Private
 */
router.get('/native-balance', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const balance = await custodialWalletService.getNativeBalance(user.custodial_wallet_address);

    res.json({
      success: true,
      data: {
        balance: balance,
        wallet: user.custodial_wallet_address,
        currency: 'KDA'
      }
    });

  } catch (error) {
    console.error('Native balance fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch native balance'
    });
  }
});

/**
 * @route   POST /api/wallet/deposit
 * @desc    Verify deposit to user's custodial wallet (external funding required)
 * @access  Private
 */
router.post('/deposit', [
  authenticateToken,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
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

    const { amount } = req.body;
    const user = req.user;
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    
    if (!tokenContractAddress) {
      return res.status(500).json({
        success: false,
        error: 'Token contract not configured'
      });
    }

    const result = await custodialWalletService.depositTokens(
      user.custodial_wallet_address,
      amount,
      tokenContractAddress
    );

    res.json({
      success: true,
      message: 'Deposit verification completed',
      data: {
        ...result,
        instructions: {
          step1: 'Send tokens to your custodial wallet address',
          step2: 'Use your custodial wallet address for external transfers',
          walletAddress: user.custodial_wallet_address,
          note: 'The system will verify the deposit automatically'
        }
      }
    });

  } catch (error) {
    console.error('Deposit verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Deposit verification failed',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw tokens or native currency from user's custodial wallet
 * @access  Private
 */
router.post('/withdraw', [
  authenticateToken,
  body('toAddress').isLength({ min: 42, max: 42 }).withMessage('Valid wallet address is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['tokens', 'native']).withMessage('Type must be either tokens or native')
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

    const { toAddress, amount, type } = req.body;
    const user = req.user;
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The authenticated user could not be found in the database. Please log in again.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.custodial_wallet_private_key) {
      return res.status(400).json({
        success: false,
        error: 'Custodial wallet not configured',
        message: 'Your custodial wallet is not properly configured. Please contact support.',
        code: 'WALLET_NOT_CONFIGURED'
      });
    }
   
    let result;
    
    if (type === 'tokens') {
      const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
      
      if (!tokenContractAddress) {
        return res.status(500).json({
          success: false,
          error: 'Token contract not configured'
        });
      }

      // Check token balance before withdrawal
      const tokenBalance = await custodialWalletService.getTokenBalance(
        user.custodial_wallet_address,
        tokenContractAddress
      );
      
      if (parseFloat(tokenBalance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient token balance',
          message: `You only have ${tokenBalance} tokens available.`,
          code: 'INSUFFICIENT_BALANCE'
        });
      }
      
      result = await custodialWalletService.withdrawTokens(
        user.custodial_wallet_private_key,
        toAddress,
        amount,
        tokenContractAddress
      );
    } else if (type === 'native') {
      // Check native balance before withdrawal
      const nativeBalance = await custodialWalletService.getNativeBalance(
        user.custodial_wallet_address
      );
      
      if (parseFloat(nativeBalance) < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient native balance',
          message: `You only have ${nativeBalance} KDA available.`,
          code: 'INSUFFICIENT_BALANCE'
        });
      }
      
      result = await custodialWalletService.withdrawNative(
        user.custodial_wallet_private_key,
        toAddress,
        amount
      );
    }

    res.json({
      success: true,
      message: `${type === 'tokens' ? 'Tokens' : 'Native KDA'} withdrawn successfully`,
      data: result
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Withdrawal failed',
      message: 'An error occurred during withdrawal. Please try again.',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get user's transaction history (placeholder)
 * @access  Private
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    // This would typically fetch from a transactions table
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Transaction history endpoint',
      data: {
        transactions: [],
        message: 'Transaction history feature coming soon'
      }
    });

  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history'
    });
  }
});

module.exports = router;
