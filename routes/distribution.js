const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const custodialWalletService = require('../services/custodialWalletService');
const encryptionService = require('../services/encryptionService');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   POST /api/distribute-tokens
 * @desc    Distribute tokens to one or multiple wallets (requires authentication)
 * @access  Private
 */
router.post('/distribute-tokens', [
  authenticate,
  body().custom((value) => {
    // Check if it's single recipient format
    if (value.name && value.walletAddress && value.hrsWorked) {
      return true;
    }
    // Check if it's bulk recipients format
    if (value.recipients && Array.isArray(value.recipients)) {
      return true;
    }
    throw new Error('Invalid request format. Must be single recipient or bulk recipients format.');
  })
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

    const body = req.body;
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    
    if (!tokenContractAddress) {
      return res.status(500).json({
        success: false,
        error: 'Token contract not configured'
      });
    }
    
    // Check if it's a single recipient (backward compatibility) or multiple recipients
    if (body.recipients && Array.isArray(body.recipients)) {
      // Multiple recipients
      const { recipients } = body;

      if (!recipients || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No recipients provided'
        });
      }

      // Validate all recipients
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        if (!recipient.name || !recipient.wallet || !recipient.hrsWorked) {
          return res.status(400).json({
            success: false,
            error: `Missing required fields for recipient ${i + 1}: name, wallet, hrsWorked`
          });
        }

        const hours = parseFloat(recipient.hrsWorked);
        if (isNaN(hours) || hours <= 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid hours worked for recipient ${i + 1} (${recipient.name}). Must be a positive number.`
          });
        }
      }

      console.log(`Distributing tokens to ${recipients.length} recipients from user's custodial wallet`);
      
      // Fetch user's private key from database
      const user = await User.findByPk(req.user.id);
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
                
      const results = await custodialWalletService.distributeFromCustodialWallet(
        user.custodial_wallet_private_key,
        recipients,
        tokenContractAddress
      );

      res.json({
        success: true,
        message: `Tokens distributed successfully to ${recipients.length} recipients`,
        data: {
          totalRecipients: recipients.length,
          successfulDistributions: results.filter(r => r.success).length,
          failedDistributions: results.filter(r => !r.success).length,
          results: results
        }
      });

    } else {
      // Single recipient (backward compatibility)
      const { name, walletAddress, hrsWorked } = body;

      if (!name || !walletAddress || !hrsWorked) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, walletAddress, hrsWorked'
        });
      }

      const hours = parseFloat(hrsWorked);
      if (isNaN(hours) || hours <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid hours worked. Must be a positive number.'
        });
      }

      const tokensToDistribute = Math.floor(hours);

      console.log(`Distributing ${tokensToDistribute} tokens to ${walletAddress} for ${hours} hours worked from user's custodial wallet`);
      
      // Fetch user's private key from database
      const user = await User.findByPk(req.user.id);
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
      console.log('user.custodial_wallet_private_key', user.custodial_wallet_private_key);
      // Decrypt the private key before using it
      
      const transactionResult = await custodialWalletService.withdrawTokens(
        user.custodial_wallet_private_key,
        walletAddress,
        tokensToDistribute,
        tokenContractAddress
      );

      res.json({
        success: true,
        message: 'Tokens distributed successfully',
        data: {
          recipient: {
            name,
            walletAddress
          },
          distribution: {
            hoursWorked: hours,
            tokensDistributed: tokensToDistribute,
            rate: '1 token per hour'
          },
          transaction: transactionResult
        }
      });
    }

  } catch (error) {
    console.error('Token distribution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to distribute tokens',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/distribute-tokens-stream
 * @desc    Distribute tokens with streaming progress updates (requires authentication)
 * @access  Private
 */
router.post('/distribute-tokens-stream', [
  authenticate,
  body().custom((value) => {
    // Only support bulk recipients format for streaming
    if (value.recipients && Array.isArray(value.recipients)) {
      return true;
    }
    throw new Error('Invalid request format. Streaming endpoint only supports bulk recipients format.');
  })
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

    const { recipients } = req.body;
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    
    if (!tokenContractAddress) {
      return res.status(500).json({
        success: false,
        error: 'Token contract not configured'
      });
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients provided'
      });
    }

    // Validate all recipients
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      if (!recipient.name || !recipient.wallet || !recipient.hrsWorked) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields for recipient ${i + 1}: name, wallet, hrsWorked`
        });
      }

      const hours = parseFloat(recipient.hrsWorked);
      if (isNaN(hours) || hours <= 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid hours worked for recipient ${i + 1} (${recipient.name}). Must be a positive number.`
        });
      }
    }

    console.log(`Streaming distribution to ${recipients.length} recipients from user's custodial wallet`);
    
    // Fetch user's private key from database
    const user = await User.findByPk(req.user.id);
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

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial message
    res.write(`data: ${JSON.stringify({
      type: 'start',
      total: recipients.length,
      message: `Starting distribution to ${recipients.length} recipients`
    })}\n\n`);

    // Progress callback function
    const onProgress = (progressData) => {
      try {
        res.write(`data: ${JSON.stringify(progressData)}\n\n`);
      } catch (error) {
        console.error('Error sending progress update:', error);
      }
    };

    // Start distribution with progress callback
    try {
      const results = await custodialWalletService.distributeFromCustodialWallet(
        user.custodial_wallet_private_key,
        recipients,
        tokenContractAddress,
        onProgress
      );

      // Send final summary
      const successfulCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: true,
        message: `Distribution completed: ${successfulCount} successful, ${failedCount} failed`,
        data: {
          totalRecipients: recipients.length,
          successfulDistributions: successfulCount,
          failedDistributions: failedCount,
          results: results
        }
      })}\n\n`);

      res.end();
    } catch (error) {
      console.error('Distribution error:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        success: false,
        error: 'Failed to distribute tokens',
        details: error.message
      })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Token distribution streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to start distribution',
        details: error.message
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        success: false,
        error: 'Failed to distribute tokens',
        details: error.message
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * @route   GET /api/distributions
 * @desc    Get distributions endpoint (placeholder)
 * @access  Public
 */
router.get('/distributions', (req, res) => {
  res.json({
    success: true,
    message: 'Distributions endpoint',
    data: []
  });
});

module.exports = router;
