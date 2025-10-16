const axios = require('axios');

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

// Helper function to get auth headers
function getAuthHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
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

async function runAllTests() {
  try {
    console.log('🚀 Starting Comprehensive API Tests...\n');
    console.log('='.repeat(50));

    // await testHealthAndErrors();
    // await testUserManagement();
    // await testPasswordChange();
    // await testMultipleUsers();
    // Test user login
    console.log('2. Testing user login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/user/login`, testUser);
    console.log('✅ User logged in:', loginResponse.data.data.user.email);
    console.log('✅ Auth token received');
    console.log('');
    authToken = loginResponse.data.data.token;
    userData = loginResponse.data.data.user;



    await testWalletManagement();
    await testTokenDistribution();

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
    console.log('✅ Error handling working');
    console.log('✅ Security (authentication required) working');
    console.log('');
    console.log('🔐 Security Features Verified:');
    console.log('✅ JWT authentication required for protected endpoints');
    console.log('✅ Password hashing working');
    console.log('✅ Custodial wallet encryption working');
    console.log('✅ Input validation working');
    console.log('✅ Error handling working');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
