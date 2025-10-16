const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const encryptionService = require('../services/encryptionService');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  custodial_wallet_address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'custodial_wallet_address'
  },
  custodial_wallet_private_key: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'custodial_wallet_private_key'
  },
  custodial_wallet_mnemonic: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'custodial_wallet_mnemonic'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      // Hash password
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      
      // Encrypt sensitive wallet data
      if (user.custodial_wallet_private_key) {
        user.custodial_wallet_private_key = encryptionService.encrypt(user.custodial_wallet_private_key);
      }
      if (user.custodial_wallet_mnemonic) {
        user.custodial_wallet_mnemonic = encryptionService.encrypt(user.custodial_wallet_mnemonic);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if changed
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      
      // Encrypt sensitive wallet data if changed
      if (user.changed('custodial_wallet_private_key') && user.custodial_wallet_private_key) {
        user.custodial_wallet_private_key = encryptionService.encrypt(user.custodial_wallet_private_key);
      }
      if (user.changed('custodial_wallet_mnemonic') && user.custodial_wallet_mnemonic) {
        user.custodial_wallet_mnemonic = encryptionService.encrypt(user.custodial_wallet_mnemonic);
      }
    },
    afterFind: async (users) => {
      // Decrypt sensitive data after retrieval
      const decryptUser = (user) => {
        if (user && user.custodial_wallet_private_key) {
          try {
            user.custodial_wallet_private_key = encryptionService.decrypt(user.custodial_wallet_private_key);
          } catch (error) {
            console.error('Failed to decrypt private key for user:', user.id, error);
          }
        }
        if (user && user.custodial_wallet_mnemonic) {
          try {
            user.custodial_wallet_mnemonic = encryptionService.decrypt(user.custodial_wallet_mnemonic);
          } catch (error) {
            console.error('Failed to decrypt mnemonic for user:', user.id, error);
          }
        }
      };

      if (Array.isArray(users)) {
        users.forEach(decryptUser);
      } else if (users) {
        decryptUser(users);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getPublicProfile = function() {
  return {
    id: this.id,
    email: this.email,
    custodialWallet: {
      address: this.custodial_wallet_address
    },
    isActive: this.is_active,
    lastLogin: this.last_login,
    createdAt: this.created_at
  };
};

module.exports = User;
