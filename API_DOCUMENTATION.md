# Token Distribution Backend API Documentation

## Overview

This is a Node.js backend API for token distribution on the Knightsbridge network. The API provides user management, custodial wallet functionality, and token distribution capabilities.

**Base URL:** `http://localhost:3001`  
**Network:** Knightsbridge (Chain ID: 8060)  
**RPC URL:** `https://mainnet-rpc.kxcoscan.com`

## Table of Contents

1. [Authentication](#authentication)
2. [Health Check](#health-check)
3. [User Management](#user-management)
4. [API Key Management](#api-key-management)
5. [Wallet Management](#wallet-management)
6. [Token Distribution](#token-distribution)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Security](#security)

---

## Authentication

The API supports two authentication methods:

### 1. JWT Authentication
Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Token Format:**
- **Algorithm:** HS256
- **Expiration:** 24 hours
- **Secret:** Configurable via `JWT_SECRET` environment variable

### 2. API Key Authentication
Include the API key in one of the following ways:

**Option 1: Authorization Header**
```
Authorization: Bearer <your-api-key>
```

**Option 2: X-API-Key Header**
```
X-API-Key: <your-api-key>
```

**Option 3: Query Parameter**
```
GET /api/endpoint?api_key=<your-api-key>
```

**API Key Format:**
- **Prefix:** `tk_`
- **Length:** 64 characters
- **Example:** `tk_a1b2c3d4e5f6...`

### Authentication Priority
The API will try authentication in this order:
1. API key authentication (if key starts with `tk_`)
2. JWT token authentication
3. Return authentication error if neither is valid

---

## Health Check

### GET /health

Check the API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Token Distribution API",
  "network": "Knightsbridge",
  "chainId": 8060
}
```

---

## User Management

### POST /api/user/register

Register a new user with custodial wallet.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation:**
- `email`: Valid email format
- `password`: Minimum 6 characters

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "custodialWallet": {
        "address": "0x..."
      },
      "isActive": true,
      "lastLogin": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  }
}
```

**Error Responses:**
- `400`: Validation failed or user already exists
- `500`: Registration failed

---

### POST /api/user/login

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "custodialWallet": {
        "address": "0x..."
      },
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  }
}
```

**Error Responses:**
- `400`: Validation failed
- `401`: Invalid credentials or account deactivated
- `500`: Login failed

---

### GET /api/user/profile

Get current user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "custodialWallet": {
        "address": "0x..."
      },
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to fetch profile

---

### POST /api/user/change-password

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Validation:**
- `currentPassword`: Required
- `newPassword`: Minimum 6 characters

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Validation failed or current password incorrect
- `401`: Unauthorized
- `404`: User not found
- `500`: Failed to change password

---

### GET /api/user/wallet

Get user's custodial wallet information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "address": "0x..."
    }
  }
}
```

---

## API Key Management

### POST /api/api-keys

Create a new API key for the authenticated user.

**Authentication:** JWT token required

**Request Body:**
```json
{
  "name": "My API Key",
  "permissions": {
    "read": true,
    "write": true,
    "admin": false
  },
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

**Validation:**
- `name`: Required, 1-100 characters
- `permissions`: Optional object with read/write/admin permissions
- `expiresAt`: Optional ISO 8601 date (must be in the future)

**Response (201):**
```json
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "My API Key",
      "key": "tk_a1b2c3d4e5f6...",
      "keyPrefix": "tk_a1b2c3...",
      "permissions": {
        "read": true,
        "write": true,
        "admin": false
      },
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400`: Validation failed or API key limit exceeded (max 10 per user)
- `401`: Authentication required
- `500`: Server error

---

### GET /api/api-keys

List all API keys for the authenticated user.

**Authentication:** JWT token required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "uuid",
        "name": "My API Key",
        "keyPrefix": "tk_a1b2c3...",
        "permissions": {
          "read": true,
          "write": true,
          "admin": false
        },
        "isActive": true,
        "lastUsed": "2024-01-01T12:00:00.000Z",
        "expiresAt": "2024-12-31T23:59:59.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### GET /api/api-keys/:id

Get details of a specific API key.

**Authentication:** JWT token required

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "My API Key",
      "keyPrefix": "tk_a1b2c3...",
      "permissions": {
        "read": true,
        "write": true,
        "admin": false
      },
      "isActive": true,
      "lastUsed": "2024-01-01T12:00:00.000Z",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### PUT /api/api-keys/:id

Update an API key (name, permissions, or active status).

**Authentication:** JWT token required

**Request Body:**
```json
{
  "name": "Updated API Key Name",
  "permissions": {
    "read": true,
    "write": false,
    "admin": false
  },
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key updated successfully",
  "data": {
    "apiKey": {
      "id": "uuid",
      "name": "Updated API Key Name",
      "keyPrefix": "tk_a1b2c3...",
      "permissions": {
        "read": true,
        "write": false,
        "admin": false
      },
      "isActive": true,
      "lastUsed": "2024-01-01T12:00:00.000Z",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### DELETE /api/api-keys/:id

Revoke (delete) an API key.

**Authentication:** JWT token required

**Response:**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

### GET /api/api-keys/test

Test API key authentication.

**Authentication:** API key required

**Response:**
```json
{
  "success": true,
  "message": "API key authentication successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "apiKey": {
      "id": "uuid",
      "name": "My API Key",
      "permissions": {
        "read": true,
        "write": true,
        "admin": false
      },
      "lastUsed": "2024-01-01T12:00:00.000Z"
    },
    "authType": "api_key"
  }
}
```

---

## Wallet Management

### GET /api/wallet/balance

Get user's token balance.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": "1000.0",
    "wallet": "0x...",
    "tokenContract": "0x..."
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Token contract not configured or failed to fetch balance

---

### GET /api/wallet/native-balance

Get user's native token balance (KDA).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": "1.5",
    "wallet": "0x...",
    "currency": "KDA"
  }
}
```

---

### POST /api/wallet/deposit

Verify deposit to user's custodial wallet.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 100.0
}
```

**Validation:**
- `amount`: Must be greater than 0

**Response (200):**
```json
{
  "success": true,
  "message": "Deposit verification completed",
  "data": {
    "success": true,
    "message": "Deposit verification completed",
    "amount": 100.0,
    "recipient": "0x...",
    "currentBalance": "1000.0",
    "type": "deposit_verification",
    "note": "User must send tokens to their custodial wallet address",
    "instructions": {
      "step1": "Send tokens to your custodial wallet address",
      "step2": "Use your custodial wallet address for external transfers",
      "walletAddress": "0x...",
      "note": "The system will verify the deposit automatically"
    }
  }
}
```

---

### POST /api/wallet/withdraw

Withdraw tokens or native currency from user's custodial wallet.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "type": "tokens",
  "toAddress": "0x...",
  "amount": 50.0
}
```

**Validation:**
- `type`: Must be either "tokens" or "native"
- `toAddress`: Valid 42-character wallet address
- `amount`: Must be greater than 0.01

**Response (200) - Token Withdrawal:**
```json
{
  "success": true,
  "message": "Tokens withdrawn successfully",
  "data": {
    "success": true,
    "transactionHash": "0x...",
    "amount": 50.0,
    "toAddress": "0x...",
    "type": "tokens"
  }
}
```

**Response (200) - Native Withdrawal:**
```json
{
  "success": true,
  "message": "Native KDA withdrawn successfully",
  "data": {
    "success": true,
    "transactionHash": "0x...",
    "amount": 0.5,
    "toAddress": "0x...",
    "type": "native"
  }
}
```

**Error Responses:**
- `400`: Validation failed, insufficient balance, or invalid amount
- `401`: Unauthorized
- `404`: User not found
- `500`: Token contract not configured or withdrawal failed

---

### GET /api/wallet/transactions

Get user's transaction history (placeholder).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Transaction history endpoint",
  "data": {
    "transactions": [],
    "message": "Transaction history feature coming soon"
  }
}
```

---

## Token Distribution

### POST /api/distribute-tokens

Distribute tokens to one or multiple wallets.

**Headers:** `Authorization: Bearer <token>`

**Single Recipient Format:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "id": "user123",
  "walletAddress": "0x...",
  "hrsWorked": 40.5
}
```

**Multiple Recipients Format:**
```json
{
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "id": "user123",
      "wallet": "0x...",
      "hrsWorked": 40.5
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "id": "user456",
      "wallet": "0x...",
      "hrsWorked": 35.0
    }
  ]
}
```

**Validation:**
- Single recipient: `name`, `email`, `id`, `walletAddress`, `hrsWorked` required
- Multiple recipients: Array of recipients with same fields (using `wallet` instead of `walletAddress`)
- `hrsWorked`: Must be a positive number

**Response (200) - Single Recipient:**
```json
{
  "success": true,
  "message": "Tokens distributed successfully",
  "data": {
    "recipient": {
      "name": "John Doe",
      "email": "john@example.com",
      "id": "user123",
      "walletAddress": "0x..."
    },
    "distribution": {
      "hoursWorked": 40.5,
      "tokensDistributed": 40,
      "rate": "1 token per hour"
    },
    "transaction": {
      "success": true,
      "transactionHash": "0x...",
      "blockNumber": 12345,
      "amount": 40,
      "from": "0x...",
      "to": "0x...",
      "type": "withdrawal",
      "explorerUrl": "https://kxcoscan.com/tx/0x..."
    }
  }
}
```

**Response (200) - Multiple Recipients:**
```json
{
  "success": true,
  "message": "Tokens distributed successfully to 2 recipients",
  "data": {
    "totalRecipients": 2,
    "successfulDistributions": 2,
    "failedDistributions": 0,
    "results": [
      {
        "success": true,
        "recipient": {
          "name": "John Doe",
          "email": "john@example.com",
          "id": "user123",
          "wallet": "0x..."
        },
        "distribution": {
          "hoursWorked": 40.5,
          "tokensDistributed": 40,
          "rate": "1 token per hour"
        },
        "transaction": {
          "success": true,
          "transactionHash": "0x...",
          "blockNumber": 12345,
          "amount": 40,
          "from": "0x...",
          "to": "0x...",
          "type": "withdrawal",
          "explorerUrl": "https://kxcoscan.com/tx/0x..."
        }
      }
    ]
  }
}
```

**Error Responses:**
- `400`: Validation failed, missing required fields, or invalid hours worked
- `401`: Unauthorized
- `500`: Token contract not configured or distribution failed

---

### POST /api/distribute-tokens-bulk

Alternative endpoint specifically for bulk distributions.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "id": "user123",
      "wallet": "0x...",
      "hrsWorked": 40.5
    }
  ]
}
```

**Validation:**
- `recipients`: Array with at least one recipient
- Each recipient requires: `name`, `email`, `id`, `wallet`, `hrsWorked`
- `wallet`: Valid 42-character address
- `hrsWorked`: Must be greater than 0

**Response (200):**
```json
{
  "success": true,
  "message": "Bulk distribution completed for 1 recipients",
  "data": {
    "totalRecipients": 1,
    "successfulDistributions": 1,
    "failedDistributions": 0,
    "results": [
      {
        "success": true,
        "recipient": {
          "name": "John Doe",
          "email": "john@example.com",
          "id": "user123",
          "wallet": "0x..."
        },
        "distribution": {
          "hoursWorked": 40.5,
          "tokensDistributed": 40,
          "rate": "1 token per hour"
        },
        "transaction": {
          "success": true,
          "transactionHash": "0x...",
          "blockNumber": 12345,
          "amount": 40,
          "from": "0x...",
          "to": "0x...",
          "type": "withdrawal",
          "explorerUrl": "https://kxcoscan.com/tx/0x..."
        }
      }
    ]
  }
}
```

---

### GET /api/distributions

Get distributions endpoint (placeholder).

**Response (200):**
```json
{
  "success": true,
  "message": "Distributions endpoint",
  "data": []
}
```

---

## Error Handling

### Enhanced Error Response Format

```json
{
  "success": false,
  "error": "Error title",
  "message": "Detailed user-friendly explanation",
  "code": "MACHINE_READABLE_CODE"
}
```

### Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `USER_NOT_FOUND` | User doesn't exist | 404 |
| `USER_ALREADY_EXISTS` | User already registered | 409 |
| `ACCOUNT_DEACTIVATED` | User account is inactive | 403 |
| `INVALID_PASSWORD` | Wrong password | 401 |
| `TOKEN_EXPIRED` | JWT token expired | 401 |
| `INVALID_TOKEN` | Malformed JWT token | 401 |
| `MISSING_TOKEN` | No authorization header | 401 |
| `WALLET_NOT_CONFIGURED` | Custodial wallet missing | 400 |
| `INSUFFICIENT_BALANCE` | Not enough funds | 400 |
| `AUTH_ERROR` | General auth failure | 500 |

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (account deactivated)
- `404`: Not Found (user not found)
- `409`: Conflict (user already exists)
- `500`: Internal Server Error

### Validation Error Format

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window:** 15 minutes
- **Limit:** 100 requests per IP address
- **Response (429):**
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later"
}
```

---

## Security

### Security Headers
- **Helmet.js** for security headers
- **CORS** configured for frontend origin
- **Session** management with secure cookies

### Data Protection
- **Password hashing** with bcrypt (12 rounds)
- **JWT tokens** for authentication
- **AES-256 encryption** for sensitive wallet data
- **Private key encryption** for custodial wallets

### Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database

# JWT
JWT_SECRET=your-jwt-secret-key

# Encryption
ENCRYPTION_KEY=your-64-character-encryption-key

# Session
SESSION_SECRET=your-session-secret

# Blockchain
RPC_URL=https://mainnet-rpc.kxcoscan.com
CHAIN_ID=8060
TOKEN_CONTRACT_ADDRESS=0x...

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## Data Models

### User Model

```javascript
{
  id: UUID (Primary Key),
  email: String (Unique),
  password: String (Hashed),
  custodial_wallet_address: String (Unique),
  custodial_wallet_private_key: String (Encrypted),
  custodial_wallet_mnemonic: String (Encrypted),
  is_active: Boolean (Default: true),
  last_login: Date,
  created_at: Date,
  updated_at: Date
}
```

---

## Blockchain Integration

### Network Details
- **Network:** Knightsbridge
- **Chain ID:** 8060
- **RPC URL:** `https://mainnet-rpc.kxcoscan.com`
- **Explorer:** `https://kxcoscan.com`

### Token Distribution Rate
- **Rate:** 1 token per hour worked
- **Calculation:** `Math.floor(hoursWorked)` tokens distributed

### Gas Management
- **Gas estimation** with 20% buffer
- **Dynamic gas pricing** based on network conditions
- **Transaction confirmation** with block number and hash

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database:**
   ```bash
   npm run init-db
   ```

4. **Generate encryption key:**
   ```bash
   npm run generate-key
   ```

5. **Start the server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

6. **Test the API:**
   ```bash
   npm test
   ```

---

## Support

For technical support or questions about the API, please refer to the project documentation or contact the development team.
