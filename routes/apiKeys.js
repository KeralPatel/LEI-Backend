const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const ApiKey = require('../models/ApiKey');
const { authenticateToken, authenticate } = require('../middleware/auth');
const { authenticateApiKey, checkApiKeyPermissions } = require('../middleware/apiKeyAuth');

const router = express.Router();

/**
 * Create a new API key
 * POST /api/api-keys
 */
router.post('/', 
  authenticateToken, // Require JWT authentication to create API keys
  [
    body('name')
      .notEmpty()
      .withMessage('API key name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name must be between 1 and 100 characters'),
    body('permissions')
      .optional()
      .isObject()
      .withMessage('Permissions must be an object')
      .custom((value) => {
        if (value) {
          const validKeys = ['read', 'write', 'admin'];
          const hasValidKeys = validKeys.some(key => key in value);
          if (!hasValidKeys) {
            throw new Error('Permissions must contain at least one valid permission');
          }
        }
        return true;
      }),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be a valid ISO 8601 date')
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Please check your input and try again.',
          details: errors.array()
        });
      }

      const { name, permissions = { read: true, write: true, admin: false }, expiresAt } = req.body;
      const userId = req.user.id;

      // Check if user already has too many API keys (limit to 10)
      const existingKeys = await ApiKey.count({
        where: { user_id: userId, is_active: true }
      });

      if (existingKeys >= 10) {
        return res.status(400).json({
          success: false,
          error: 'API key limit exceeded',
          message: 'You can have a maximum of 10 active API keys. Please revoke some existing keys before creating new ones.',
          code: 'API_KEY_LIMIT_EXCEEDED'
        });
      }

      // Generate API key
      const crypto = require('crypto');
      const plainKey = `tk_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
      const keyPrefix = plainKey.substring(0, 8) + '...';

      // Create API key
      const apiKey = await ApiKey.create({
        name,
        user_id: userId,
        permissions,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        key_hash: keyHash,
        key_prefix: keyPrefix
      });

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: {
          apiKey: {
            id: apiKey.id,
            name: apiKey.name,
            key: plainKey, // Only returned once during creation
            keyPrefix: keyPrefix,
            permissions: apiKey.permissions,
            expiresAt: apiKey.expires_at,
            createdAt: apiKey.created_at
          }
        }
      });

    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create API key',
        message: 'An error occurred while creating the API key. Please try again.',
        code: 'CREATE_API_KEY_ERROR'
      });
    }
  }
);

/**
 * List user's API keys
 * GET /api/api-keys
 */
router.get('/',
  authenticateToken, // Require JWT authentication to list API keys
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Please check your query parameters.',
          details: errors.array()
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows: apiKeys } = await ApiKey.findAndCountAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: { exclude: ['key_hash'] }
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          apiKeys: apiKeys.map(key => key.getPublicInfo()),
          pagination: {
            page,
            limit,
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list API keys',
        message: 'An error occurred while retrieving API keys. Please try again.',
        code: 'LIST_API_KEYS_ERROR'
      });
    }
  }
);

/**
 * Get specific API key details
 * GET /api/api-keys/:id
 */
router.get('/:id',
  authenticateToken,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid API key ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid API key ID.',
          details: errors.array()
        });
      }

      const apiKey = await ApiKey.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id
        },
        attributes: { exclude: ['key_hash'] }
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
          message: 'The requested API key does not exist or you do not have permission to access it.',
          code: 'API_KEY_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          apiKey: apiKey.getPublicInfo()
        }
      });

    } catch (error) {
      console.error('Error getting API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get API key',
        message: 'An error occurred while retrieving the API key. Please try again.',
        code: 'GET_API_KEY_ERROR'
      });
    }
  }
);

/**
 * Update API key
 * PUT /api/api-keys/:id
 */
router.put('/:id',
  authenticateToken,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid API key ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name must be between 1 and 100 characters'),
    body('permissions')
      .optional()
      .isObject()
      .withMessage('Permissions must be an object'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Please check your input.',
          details: errors.array()
        });
      }

      const apiKey = await ApiKey.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id
        }
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
          message: 'The requested API key does not exist or you do not have permission to access it.',
          code: 'API_KEY_NOT_FOUND'
        });
      }

      const { name, permissions, isActive } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (isActive !== undefined) updateData.is_active = isActive;

      await apiKey.update(updateData);

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: {
          apiKey: apiKey.getPublicInfo()
        }
      });

    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update API key',
        message: 'An error occurred while updating the API key. Please try again.',
        code: 'UPDATE_API_KEY_ERROR'
      });
    }
  }
);

/**
 * Revoke (delete) API key
 * DELETE /api/api-keys/:id
 */
router.delete('/:id',
  authenticateToken,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid API key ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid API key ID.',
          details: errors.array()
        });
      }

      const apiKey = await ApiKey.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id
        }
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
          message: 'The requested API key does not exist or you do not have permission to access it.',
          code: 'API_KEY_NOT_FOUND'
        });
      }

      await apiKey.destroy();

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });

    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
        message: 'An error occurred while revoking the API key. Please try again.',
        code: 'REVOKE_API_KEY_ERROR'
      });
    }
  }
);

/**
 * Test API key authentication
 * GET /api/api-keys/test
 */
router.get('/test',
  authenticate,
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'API key authentication successful',
        data: {
          user: {
            id: req.user.id,
            email: req.user.email
          },
          apiKey: {
            id: req.apiKey.id,
            name: req.apiKey.name,
            permissions: req.apiKey.permissions,
            lastUsed: req.apiKey.last_used
          },
          authType: req.authType
        }
      });
    } catch (error) {
      console.error('Error testing API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test API key',
        message: 'An error occurred while testing the API key.',
        code: 'TEST_API_KEY_ERROR'
      });
    }
  }
);

module.exports = router;
