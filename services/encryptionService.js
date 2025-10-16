const CryptoJS = require('crypto-js');

class EncryptionService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Ensure the key is 32 bytes (256 bits) for AES-256
    if (this.encryptionKey.length !== 64) {
      console.warn('⚠️  ENCRYPTION_KEY should be 64 characters (32 bytes) for optimal security');
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @returns {string} - Encrypted data
   */
  encrypt(data) {
    try {
      if (!data) {
        throw new Error('Data to encrypt cannot be empty');
      }
      
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data
   * @returns {string} - Decrypted data
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('Encrypted data cannot be empty');
      }
      
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Failed to decrypt data - invalid key or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate a secure encryption key
   * @returns {string} - 64 character hex string
   */
  static generateEncryptionKey() {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Hash data for comparison (one-way)
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data
   */
  hash(data) {
    try {
      return CryptoJS.SHA256(data).toString();
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }
}

module.exports = new EncryptionService();
