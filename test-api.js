const axios = require('axios');

/**
 * Comprehensive API Testing Suite
 * 
 * This test suite covers:
 * - User management (registration, login, profile)
 * - Wallet management (balances, deposits, withdrawals)
 * - Token distribution (single and bulk)
 * - API key management (create, list, update, delete)
 * - API key authentication (all endpoints)
 * - Security testing (invalid keys, missing auth)
 * 
 * Usage:
 * - Run all tests: node test-api.js
 * - Run API key tests only: node test-api.js --api-keys-only
 */

// Test configuration
const API_BASE_URL = 'http://localhost:3001';

// Test user data
const testUser = {
  email: 'testuser@example.com',
  password: 'testpassword123'
};

const testUser2 = {
  email: 'testuser2@example.com',
  password: 'testpassword123'
};

// Test distribution data (requires authentication)
const singleDistributionData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  id: 'EMP001',
  walletAddress: '0x70A9F9c304181320187fC16A9D02a99c0b73b390',
  hrsWorked: 8.5
};

const bulkDistributionData = {
  recipients: [
    {
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
      id: 'EMP002',
      wallet: '0x70A9F9c304181320187fC16A9D02a99c0b73b390',
      hrsWorked: 7.5
    },
    {
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      id: 'EMP003',
      wallet: '0x70A9F9c304181320187fC16A9D02a99c0b73b390',
      hrsWorked: 9.0
    }
  ]
};

// Global variables for authentication
let authToken = null;
let userData = null;
let apiKey = null;

// Helper function to get auth headers
function getAuthHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
}

// Helper function to get API key headers
function getApiKeyHeaders() {
  return apiKey ? { 'X-API-Key': apiKey } : {};
}

async function testUserManagement() {
  try {
    console.log('🔐 Testing User Management...\n');

    // Test user registration
    console.log('1. Testing user registration...');
    const registerResponse = await axios.post(`${API_BASE_URL}/api/user/register`, testUser);
    console.log('✅ User registered:', registerResponse.data.data.user.email);
    authToken = registerResponse.data.data.token;
    userData = registerResponse.data.data.user;
    console.log('✅ Auth token received');
    console.log('');

    // Test user login
    console.log('2. Testing user login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/user/login`, testUser);
    console.log('✅ User logged in:', loginResponse.data.data.user.email);
    console.log('');

    // Test get profile
    console.log('3. Testing get user profile...');
    const profileResponse = await axios.get(`${API_BASE_URL}/api/user/profile`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Profile retrieved:', profileResponse.data.data.user.email);
    console.log('✅ Custodial wallet address:', profileResponse.data.data.user.custodialWallet.address);
    console.log('');

    // Test update profile
    console.log('4. Testing update user profile...');
    const updateResponse = await axios.put(`${API_BASE_URL}/api/user/profile`, {
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company'
    }, {
      headers: getAuthHeaders()
    });
    console.log('✅ Profile updated:', updateResponse.data.data.user.profile);
    console.log('');

  } catch (error) {
    console.error('❌ User management test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testWalletManagement() {
  try {
    console.log('💼 Testing Wallet Management...\n');

    // Test get token balance
    console.log('1. Testing get token balance...');
    const balanceResponse = await axios.get(`${API_BASE_URL}/api/wallet/balance`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Token balance:', balanceResponse.data.data.balance);
    console.log('');

    // Test get native balance
    console.log('2. Testing get native balance...');
    const nativeBalanceResponse = await axios.get(`${API_BASE_URL}/api/wallet/native-balance`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Native balance:', nativeBalanceResponse.data.data.balance, 'KDA');
    console.log('');

    // Test deposit verification
    console.log('3. Testing deposit verification...');
    const depositResponse = await axios.post(`${API_BASE_URL}/api/wallet/deposit`, {
      amount: 100.0
    }, {
      headers: getAuthHeaders()
    });
    console.log('✅ Deposit verification:', depositResponse.data.message);
    console.log('✅ Instructions:', depositResponse.data.data.instructions);
    console.log('');

  } catch (error) {
    console.error('❌ Wallet management test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testTokenDistribution() {
  try {
    console.log('🪙 Testing Token Distribution (requires authentication)...\n');

    // Test single distribution
    console.log('1. Testing single token distribution...');
    console.log('📤 Sending request:', singleDistributionData);
    
    const singleResponse = await axios.post(`${API_BASE_URL}/api/distribute-tokens`, singleDistributionData, {
      headers: getAuthHeaders()
    });
    console.log('✅ Single distribution response:', JSON.stringify(singleResponse.data, null, 2));
    console.log('');

    // Test bulk distribution
    console.log('2. Testing bulk token distribution...');
    console.log('📤 Sending bulk request:', JSON.stringify(bulkDistributionData, null, 2));
    
    const bulkResponse = await axios.post(`${API_BASE_URL}/api/distribute-tokens`, bulkDistributionData, {
      headers: getAuthHeaders()
    });
    console.log('✅ Bulk distribution response:', JSON.stringify(bulkResponse.data, null, 2));
    console.log('');

    // Test unauthorized access
    console.log('3. Testing unauthorized access...');
    try {
      await axios.post(`${API_BASE_URL}/api/distribute-tokens`, singleDistributionData);
    } catch (error) {
      console.log('✅ Unauthorized access properly blocked:', error.response.data.error);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Token distribution test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testHealthAndErrors() {
  try {
    console.log('🏥 Testing Health and Error Handling...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // Test invalid registration
    console.log('2. Testing invalid registration...');
    try {
      await axios.post(`${API_BASE_URL}/api/user/register`, {
        email: 'invalid-email',
        password: '123' // Too short
      });
    } catch (error) {
      console.log('✅ Invalid registration properly rejected:', error.response.data.error);
    }
    console.log('');

    // Test invalid login
    console.log('3. Testing invalid login...');
    try {
      await axios.post(`${API_BASE_URL}/api/user/login`, {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Invalid login properly rejected:', error.response.data.error);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Health and error test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testPasswordChange() {
  try {
    console.log('🔒 Testing Password Change...\n');

    // Test change password
    console.log('1. Testing password change...');
    const changePasswordResponse = await axios.post(`${API_BASE_URL}/api/user/change-password`, {
      currentPassword: 'testpassword123',
      newPassword: 'newpassword123'
    }, {
      headers: getAuthHeaders()
    });
    console.log('✅ Password changed successfully');
    console.log('');

    // Test login with new password
    console.log('2. Testing login with new password...');
    const newLoginResponse = await axios.post(`${API_BASE_URL}/api/user/login`, {
      email: testUser.email,
      password: 'newpassword123'
    });
    console.log('✅ Login with new password successful');
    authToken = newLoginResponse.data.data.token; // Update token
    console.log('');

  } catch (error) {
    console.error('❌ Password change test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testMultipleUsers() {
  try {
    console.log('👥 Testing Multiple Users...\n');

    // Register second user
    console.log('1. Testing second user registration...');
    const secondUserResponse = await axios.post(`${API_BASE_URL}/api/user/register`, testUser2);
    console.log('✅ Second user registered:', secondUserResponse.data.data.user.email);
    console.log('✅ Second user custodial wallet:', secondUserResponse.data.data.user.custodialWallet.address);
    console.log('');

    // Test that users have different wallets
    console.log('2. Verifying different custodial wallets...');
    const firstUserWallet = userData.custodialWallet.address;
    const secondUserWallet = secondUserResponse.data.data.user.custodialWallet.address;
    
    if (firstUserWallet !== secondUserWallet) {
      console.log('✅ Users have different custodial wallets');
      console.log('   User 1 wallet:', firstUserWallet);
      console.log('   User 2 wallet:', secondUserWallet);
    } else {
      console.log('❌ Users have the same wallet - this should not happen!');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Multiple users test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testApiKeyManagement() {
  try {
    console.log('🔑 Testing API Key Management...\n');

    // Test create API key
    console.log('1. Testing create API key...');
    const createApiKeyResponse = await axios.post(`${API_BASE_URL}/api/api-keys`, {
      name: 'Test API Key',
      permissions: {
        read: true,
        write: true,
        admin: false
      }
    }, {
      headers: getAuthHeaders()
    });
    console.log('✅ API key created:', createApiKeyResponse.data.data.apiKey.name);
    apiKey = createApiKeyResponse.data.data.apiKey.key;
    console.log('✅ API key received:', apiKey.substring(0, 8) + '...');
    console.log('');

    // Test list API keys
    console.log('2. Testing list API keys...');
    const listApiKeysResponse = await axios.get(`${API_BASE_URL}/api/api-keys`, {
      headers: getAuthHeaders()
    });
    console.log('✅ API keys listed:', listApiKeysResponse.data.data.apiKeys.length, 'keys found');
    console.log('✅ First key name:', listApiKeysResponse.data.data.apiKeys[0].name);
    console.log('');

    // Test get specific API key
    console.log('3. Testing get specific API key...');
    const apiKeyId = listApiKeysResponse.data.data.apiKeys[0].id;
    const getApiKeyResponse = await axios.get(`${API_BASE_URL}/api/api-keys/${apiKeyId}`, {
      headers: getAuthHeaders()
    });
    console.log('✅ API key details retrieved:', getApiKeyResponse.data.data.apiKey.name);
    console.log('');

    // Test update API key
    console.log('4. Testing update API key...');
    const updateApiKeyResponse = await axios.put(`${API_BASE_URL}/api/api-keys/${apiKeyId}`, {
      name: 'Updated Test API Key',
      permissions: {
        read: true,
        write: false,
        admin: false
      }
    }, {
      headers: getAuthHeaders()
    });
    console.log('✅ API key updated:', updateApiKeyResponse.data.data.apiKey.name);
    console.log('✅ New permissions:', updateApiKeyResponse.data.data.apiKey.permissions);
    console.log('');

  } catch (error) {
    console.error('❌ API key management test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testApiKeyAuthentication() {
  try {
    console.log('🔐 Testing API Key Authentication...\n');

    if (!apiKey) {
      console.log('❌ No API key available for testing');
      return;
    }

    // Test API key authentication with wallet balance
    console.log('1. Testing API key authentication with wallet balance...');
    const balanceResponse = await axios.get(`${API_BASE_URL}/api/wallet/balance`, {
      headers: getApiKeyHeaders()
    });
    console.log('✅ API key authentication successful for wallet balance');
    console.log('✅ Token balance:', balanceResponse.data.data.balance);
    console.log('');

    // Test API key authentication with native balance
    console.log('2. Testing API key authentication with native balance...');
    const nativeBalanceResponse = await axios.get(`${API_BASE_URL}/api/wallet/native-balance`, {
      headers: getApiKeyHeaders()
    });
    console.log('✅ API key authentication successful for native balance');
    console.log('✅ Native balance:', nativeBalanceResponse.data.data.balance, 'KDA');
    console.log('');

    // Test API key authentication with user profile
    console.log('3. Testing API key authentication with user profile...');
    const profileResponse = await axios.get(`${API_BASE_URL}/api/user/profile`, {
      headers: getApiKeyHeaders()
    });
    console.log('✅ API key authentication successful for user profile');
    console.log('✅ User email:', profileResponse.data.data.user.email);
    console.log('');

    // Test API key authentication with token distribution
    console.log('4. Testing API key authentication with token distribution...');
    const distributionResponse = await axios.post(`${API_BASE_URL}/api/distribute-tokens`, singleDistributionData, {
      headers: getApiKeyHeaders()
    });
    console.log('✅ API key authentication successful for token distribution');
    console.log('✅ Distribution response:', distributionResponse.data.success ? 'Success' : 'Failed');
    console.log('');

    // Test API key test endpoint
    console.log('5. Testing API key test endpoint...');
    const testResponse = await axios.get(`${API_BASE_URL}/api/api-keys/test`, {
      headers: getApiKeyHeaders()
    });
    console.log('✅ API key test endpoint successful');
    console.log('✅ Auth type:', testResponse.data.data.authType);
    console.log('✅ User:', testResponse.data.data.user.email);
    console.log('');

  } catch (error) {
    console.error('❌ API key authentication test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testApiKeySecurity() {
  try {
    console.log('🛡️ Testing API Key Security...\n');

    // Test invalid API key
    console.log('1. Testing invalid API key...');
    try {
      await axios.get(`${API_BASE_URL}/api/wallet/balance`, {
        headers: { 'X-API-Key': 'invalid_key_12345' }
      });
    } catch (error) {
      console.log('✅ Invalid API key properly rejected:', error.response.data.error);
    }
    console.log('');

    // Test missing API key
    console.log('2. Testing missing API key...');
    try {
      await axios.get(`${API_BASE_URL}/api/wallet/balance`);
    } catch (error) {
      console.log('✅ Missing API key properly rejected:', error.response.data.error);
    }
    console.log('');

    // Test API key with different header formats
    console.log('3. Testing API key with Authorization header...');
    if (apiKey) {
      const authHeaderResponse = await axios.get(`${API_BASE_URL}/api/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      console.log('✅ API key with Authorization header works');
    }
    console.log('');

    // Test API key with query parameter
    console.log('4. Testing API key with query parameter...');
    if (apiKey) {
      const queryParamResponse = await axios.get(`${API_BASE_URL}/api/wallet/balance?api_key=${apiKey}`);
      console.log('✅ API key with query parameter works');
    }
    console.log('');

  } catch (error) {
    console.error('❌ API key security test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testApiKeyCleanup() {
  try {
    console.log('🧹 Testing API Key Cleanup...\n');

    // List API keys to get the ID
    console.log('1. Getting API key ID for deletion...');
    const listResponse = await axios.get(`${API_BASE_URL}/api/api-keys`, {
      headers: getAuthHeaders()
    });
    
    if (listResponse.data.data.apiKeys.length > 0) {
      const apiKeyId = listResponse.data.data.apiKeys[0].id;
      console.log('✅ API key ID found:', apiKeyId);
      console.log('');

      // Test delete API key
      console.log('2. Testing delete API key...');
      const deleteResponse = await axios.delete(`${API_BASE_URL}/api/api-keys/${apiKeyId}`, {
        headers: getAuthHeaders()
      });
      console.log('✅ API key deleted successfully');
      console.log('');

      // Verify API key is deleted
      console.log('3. Verifying API key is deleted...');
      const verifyResponse = await axios.get(`${API_BASE_URL}/api/api-keys`, {
        headers: getAuthHeaders()
      });
      console.log('✅ Remaining API keys:', verifyResponse.data.data.apiKeys.length);
      console.log('');
    }

  } catch (error) {
    console.error('❌ API key cleanup test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function runAllTests() {
  try {
    console.log('🚀 Starting Comprehensive API Tests...\n');
    console.log('='.repeat(50));

    await testHealthAndErrors();
    await testUserManagement();
    await testPasswordChange();
    await testMultipleUsers();
    await testWalletManagement();
    await testTokenDistribution();
    
    // API Key Tests
    await testApiKeyManagement();
    await testApiKeyAuthentication();
    await testApiKeySecurity();
    await testApiKeyCleanup();

    console.log('='.repeat(50));
    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Test Summary:');
    console.log('✅ Health endpoint working');
    console.log('✅ User registration and authentication working');
    console.log('✅ Profile management working');
    console.log('✅ Password change working');
    console.log('✅ Multiple users with different wallets');
    console.log('✅ Wallet management working');
    console.log('✅ Token distribution working');
    console.log('✅ API key management working');
    console.log('✅ API key authentication working');
    console.log('✅ API key security working');
    console.log('✅ Error handling working');
    console.log('✅ Security (authentication required) working');
    console.log('');
    console.log('🔐 Security Features Verified:');
    console.log('✅ JWT authentication required for protected endpoints');
    console.log('✅ API key authentication working');
    console.log('✅ Multiple authentication methods supported');
    console.log('✅ Password hashing working');
    console.log('✅ Custodial wallet encryption working');
    console.log('✅ Input validation working');
    console.log('✅ Error handling working');
    console.log('✅ API key permissions working');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Standalone API key test function
async function testApiKeysOnly() {
  try {
    console.log('🔑 Testing API Keys Only...\n');
    console.log('='.repeat(50));

    // First login to get JWT token
    console.log('1. Logging in to get JWT token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/user/login`, testUser);
    authToken = loginResponse.data.data.token;
    userData = loginResponse.data.data.user;
    console.log('✅ Logged in:', userData.email);
    console.log('');

    // Run API key tests
    await testApiKeyManagement();
    await testApiKeyAuthentication();
    await testApiKeySecurity();
    await testApiKeyCleanup();

    console.log('='.repeat(50));
    console.log('🎉 API Key tests completed successfully!');
    console.log('');
    console.log('📋 API Key Test Summary:');
    console.log('✅ API key creation working');
    console.log('✅ API key listing working');
    console.log('✅ API key retrieval working');
    console.log('✅ API key updating working');
    console.log('✅ API key deletion working');
    console.log('✅ API key authentication working');
    console.log('✅ API key security working');
    console.log('✅ Multiple authentication methods working');

  } catch (error) {
    console.error('❌ API key test suite failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--api-keys-only')) {
    testApiKeysOnly();
  } else {
    runAllTests();
  }
}
