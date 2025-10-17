const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const ApiKey = sequelize.define('ApiKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  key_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'key_hash'
  },
  key_prefix: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'key_prefix'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      read: true,
      write: true,
      admin: false
    },
    validate: {
      isValidPermissions(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Permissions must be an object');
        }
        const validKeys = ['read', 'write', 'admin'];
        const hasValidKeys = validKeys.some(key => key in value);
        if (!hasValidKeys) {
          throw new Error('Permissions must contain at least one valid permission');
        }
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  last_used: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'api_keys' 
});

// Hook removed - key generation is now handled in the route

// Instance methods
ApiKey.prototype.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > this.expires_at;
};

ApiKey.prototype.isValid = function() {
  return this.is_active && !this.isExpired();
};

ApiKey.prototype.updateLastUsed = async function() {
  this.last_used = new Date();
  await this.save();
};

ApiKey.prototype.getPublicInfo = function() {
  return {
    id: this.id,
    name: this.name,
    keyPrefix: this.key_prefix,
    permissions: this.permissions,
    isActive: this.is_active,
    lastUsed: this.last_used,
    expiresAt: this.expires_at,
    createdAt: this.created_at
  };
};

// Static methods
ApiKey.generateKey = function() {
  return `tk_${crypto.randomBytes(32).toString('hex')}`;
};

ApiKey.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

ApiKey.findByKey = async function(key) {
  const keyHash = ApiKey.hashKey(key);
  return await ApiKey.findOne({
    where: { key_hash: keyHash },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'email', 'is_active', 'custodial_wallet_address']
    }]
  });
};

// Associations
const User = require('./User');
ApiKey.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'CASCADE'
});
User.hasMany(ApiKey, { 
  foreignKey: 'user_id', 
  as: 'apiKeys',
  onDelete: 'CASCADE'
});

module.exports = ApiKey;
