# Token Distribution Backend

A comprehensive Node.js backend API for user management, custodial wallets, and token distribution on the Knightsbridge network. This system provides secure token distribution capabilities with user authentication and custodial wallet management.

## 🚀 Features

### 🔐 User Management
- **JWT Authentication**: Secure token-based authentication with 24-hour expiration
- **User Registration**: Automatic custodial wallet creation upon registration
- **Profile Management**: Change passwords
- **Session Management**: Secure session handling with configurable timeouts
- **Password Security**: bcrypt hashing with 12 rounds of salt

### 💼 Custodial Wallets
- **Automatic Wallet Creation**: Each user gets a unique custodial wallet upon registration
- **External Funding**: Users must send tokens and native currency for the gas fee to their custodial wallet address
- **Withdraw Operations**: Users can withdraw both tokens and native KDA from their custodial wallets
- **Balance Tracking**: Real-time balance checking for both native (KDA) and token balances
- **Secure Storage**: Private keys and mnemonics are AES-256 encrypted and stored in the database
- **Enhanced Error Handling**: Detailed error messages with specific error codes for better user experience

### 🪙 Token Distribution
- **User-Based Distribution**: Token distributions use authenticated user's custodial wallets
- **Single & Bulk Distribution**: Support for both individual and multiple recipient distributions
- **Authentication Required**: All distribution endpoints require user authentication
- **Balance Validation**: Automatic balance checking before distributions
- **Rate Calculation**: 1 token per hour worked (rounded down)
- **Transaction Tracking**: Full transaction hash and block number tracking

### 🛡️ Security Features
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Helmet Security**: Security headers and protection against common vulnerabilities
- **Input Validation**: Comprehensive request validation using express-validator
- **CORS Protection**: Configurable CORS settings for frontend integration
- **Data Encryption**: AES-256 encryption for sensitive wallet data
- **Secure Storage**: All sensitive data is encrypted before database storage
- **JWT Security**: Secure token generation and validation

### 🗄️ Database & Infrastructure
- **PostgreSQL Integration**: Robust database with Sequelize ORM
- **User Data Storage**: Secure storage of user profiles and wallet information
- **Database Migrations**: Automatic database schema management
- **Connection Pooling**: Optimized database connections
- **Data Validation**: Model-level validation and constraints

## 🌐 Network Configuration

- **Network Name**: Knightsbridge
- **RPC URL**: https://mainnet-rpc.kxcoscan.com
- **Chain ID**: 8060
- **Currency**: KDA
- **Block Explorer**: https://kxcoscan.com
- **Gas Currency**: KDA

## 📚 API Documentation

For complete API documentation with all endpoints, request/response examples, and error codes, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### 🔐 User Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/user/register` | Register new user with custodial wallet | No |
| POST | `/api/user/login` | Login and get JWT token | No |
| GET | `/api/user/profile` | Get user profile | Yes |
| POST | `/api/user/change-password` | Change user password | Yes |
| GET | `/api/user/wallet` | Get user's custodial wallet info | Yes |

### 💼 Wallet Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/wallet/balance` | Get token balance | Yes |
| GET | `/api/wallet/native-balance` | Get native KDA balance | Yes |
| POST | `/api/wallet/deposit` | Verify deposit to custodial wallet | Yes |
| POST | `/api/wallet/withdraw` | Withdraw tokens from custodial wallet | Yes |

### 🪙 Token Distribution Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/distribute-tokens` | Distribute tokens (single) | Yes |
| POST | `/api/distribute-tokens-bulk` | Bulk token distribution | Yes |
| GET | `/api/distributions` | Get distributions (placeholder) | No |

### 🏥 System Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |

## 🚀 Quick Start Examples

### User Registration & Login
```bash
# Register a new user
curl -X POST http://localhost:3001/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:3001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Token Distribution
```bash
# Single recipient distribution
curl -X POST http://localhost:3001/api/distribute-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "id": "EMP001",
    "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "hrsWorked": 8.5
  }'

# Bulk distribution
curl -X POST http://localhost:3001/api/distribute-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "recipients": [
      {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "id": "EMP002",
        "wallet": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "hrsWorked": 7.5
      }
    ]
  }'
```

### Wallet Operations
```bash
# Check token balance
curl -X GET http://localhost:3001/api/wallet/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check native KDA balance
curl -X GET http://localhost:3001/api/wallet/native-balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Withdraw tokens
curl -X POST http://localhost:3001/api/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "tokens",
    "toAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "amount": 50.0
  }'

# Withdraw native KDA
curl -X POST http://localhost:3001/api/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "native",
    "toAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "amount": 0.5
  }'
```

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### 📦 Installation Steps

1. **Clone and Install Dependencies:**
   ```bash
   git clone <repository-url>
   cd token-distribution-backend/backend
   npm install
   ```

2. **Database Setup:**
   Create a PostgreSQL database:
   ```sql
   CREATE DATABASE token_distribution;
   ```

3. **Environment Configuration:**
   ```bash
   cp env.example .env
   ```
   
   **Required Environment Variables:**
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/token_distribution
   
   # JWT & Session Security
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   SESSION_SECRET=your-session-secret-change-in-production
   
   # Encryption (for sensitive wallet data)
   ENCRYPTION_KEY=your-64-character-encryption-key-for-wallet-data-security
   
   # Blockchain Configuration
   RPC_URL=https://mainnet-rpc.kxcoscan.com
   CHAIN_ID=8060
   TOKEN_CONTRACT_ADDRESS=your_token_contract_address_here
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Generate Encryption Key:**
   ```bash
   npm run generate-key
   ```
   Copy the generated 64-character key to your `.env` file as `ENCRYPTION_KEY`.

5. **Initialize Database:**
   ```bash
   # Initialize database tables
   npm run init-db
   
   # Or sync database schema
   npm run db:sync
   ```

6. **Start the Server:**
   ```bash
   # Development (with auto-reload)
   npm run dev
   
   # Production
   npm start
   ```

7. **Test the API:**
   ```bash
   npm test
   ```

### 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run API tests |
| `npm run init-db` | Initialize database tables |
| `npm run db:sync` | Sync database schema |
| `npm run generate-key` | Generate encryption key |

## 🏗️ Project Structure

```
backend/
├── 📁 config/
│   └── database.js               # Database configuration
├── 📁 middleware/
│   └── auth.js                   # Authentication middleware
├── 📁 models/
│   └── User.js                   # User database model
├── 📁 routes/
│   ├── user.js                   # User management routes
│   ├── wallet.js                 # Wallet management routes
│   └── distribution.js           # Token distribution routes
├── 📁 services/
│   ├── custodialWalletService.js # Custodial wallet operations
│   └── encryptionService.js       # Data encryption service
├── 📁 scripts/
│   ├── generate-encryption-key.js # Generate encryption key
│   └── init-db.js               # Database initialization
├── 📄 server.js                 # Express server
├── 📄 test-api.js               # API tests
├── 📄 package.json              # Dependencies
├── 📄 env.example              # Environment template
├── 📄 API_DOCUMENTATION.md     # Complete API documentation
└── 📄 README.md                # This file
```

## 🔒 Security Features

### Data Protection
- **AES-256 Encryption**: All sensitive wallet data is encrypted
- **bcrypt Password Hashing**: 12 rounds of salt for password security
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin resource sharing

### Best Practices
- **Environment Variables**: Never commit sensitive data to version control
- **Secure Storage**: Private keys and mnemonics are encrypted before database storage
- **Network Security**: Helmet.js for security headers
- **Session Management**: Secure session handling with configurable timeouts

## 🚨 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **"ENCRYPTION_KEY environment variable is required"** | Run `npm run generate-key` and add the key to `.env` |
| **"TOKEN_CONTRACT_ADDRESS environment variable is required"** | Add your token contract address to `.env` |
| **"Insufficient token balance"** | Ensure your custodial wallet has enough tokens |
| **"Invalid recipient wallet address"** | Verify the wallet address format (0x...) |
| **"Database connection failed"** | Check PostgreSQL is running and credentials are correct |
| **"JWT token expired"** | Re-login to get a new token |

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📊 API Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Test Script
```bash
npm test
```

## 🔗 Related Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[Environment Variables](./env.example)** - Configuration template
- **[Database Schema](./models/User.js)** - User model definition

## 📞 Support

For technical support or questions:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the troubleshooting section above
- Open an issue in the repository