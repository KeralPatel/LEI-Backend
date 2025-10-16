const CryptoJS = require('crypto-js');

console.log('🔐 Generating secure encryption key...');
console.log('');
console.log('Generated Encryption Key:');
console.log(CryptoJS.lib.WordArray.random(32).toString());
console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Store this key securely - it cannot be recovered if lost');
console.log('2. Never commit this key to version control');
console.log('3. Use different keys for different environments (dev/staging/prod)');
console.log('4. If you lose this key, all encrypted wallet data will be unrecoverable');
console.log('');
console.log('Add this key to your .env file as:');
console.log('ENCRYPTION_KEY=your-generated-key-here');
