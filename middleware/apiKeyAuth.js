const ApiKey = require('../models/ApiKey');

/**
 * Authenticate using API key
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        message: 'Please provide a valid API key in the Authorization header (Bearer token), X-API-Key header, or api_key query parameter.',
        code: 'MISSING_API_KEY'
      });
    }

    // Find API key in database
    const apiKeyRecord = await ApiKey.findByKey(apiKey);
    
    if (!apiKeyRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is invalid or does not exist.',
        code: 'INVALID_API_KEY'
      });
    }

    // Check if API key is valid
    if (!apiKeyRecord.isValid()) {
      return res.status(401).json({
        success: false,
        error: 'API key inactive or expired',
        message: apiKeyRecord.isExpired() 
          ? 'The API key has expired. Please generate a new one.'
          : 'The API key is inactive. Please contact support for assistance.',
        code: apiKeyRecord.isExpired() ? 'API_KEY_EXPIRED' : 'API_KEY_INACTIVE'
      });
    }

    // Check if user is active
    if (!apiKeyRecord.user || !apiKeyRecord.user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'User account inactive',
        message: 'The user account associated with this API key is inactive.',
        code: 'USER_INACTIVE'
      });
    }

    // Update last used timestamp
    await apiKeyRecord.updateLastUsed();

    // Attach user and API key info to request
    req.user = apiKeyRecord.user;
    req.apiKey = apiKeyRecord;
    req.authType = 'api_key';

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during API key authentication. Please try again.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Check API key permissions
 */
const checkApiKeyPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (req.authType !== 'api_key') {
      return next(); // Skip permission check for JWT auth
    }

    const apiKeyPermissions = req.apiKey.permissions;
    const hasPermission = requiredPermissions.every(permission => 
      apiKeyPermissions[permission] === true
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This API key does not have the required permissions: ${requiredPermissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions,
        currentPermissions: apiKeyPermissions
      });
    }

    next();
  };
};

/**
 * Optional API key authentication - doesn't fail if no key provided
 */
const optionalApiKeyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.headers['x-api-key'] || req.query.api_key;

    if (apiKey) {
      const apiKeyRecord = await ApiKey.findByKey(apiKey);
      
      if (apiKeyRecord && apiKeyRecord.isValid() && apiKeyRecord.user && apiKeyRecord.user.is_active) {
        await apiKeyRecord.updateLastUsed();
        req.user = apiKeyRecord.user;
        req.apiKey = apiKeyRecord;
        req.authType = 'api_key';
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateApiKey,
  checkApiKeyPermissions,
  optionalApiKeyAuth
};
