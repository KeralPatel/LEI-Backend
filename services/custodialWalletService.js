const { ethers } = require('ethers');

class CustodialWalletService {
  constructor() {
    this.rpcUrl = process.env.RPC_URL || 'https://mainnet-rpc.kxcoscan.com';
    this.chainId = process.env.CHAIN_ID || '8060';
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Generate a new custodial wallet for a user
   */
  generateCustodialWallet() {
    try {
      // Generate a new wallet
      const wallet = ethers.Wallet.createRandom();
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };
    } catch (error) {
      console.error('Error generating custodial wallet:', error);
      throw new Error('Failed to generate custodial wallet');
    }
  }

  /**
   * Get wallet balance (native token)
   */
  async getNativeBalance(walletAddress) {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting native balance:', error);
      throw new Error('Failed to get native balance');
    }
  }

  /**
   * Get token balance for a specific token contract
   */
  async getTokenBalance(walletAddress, tokenContractAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenContractAddress,
        [
          "function balanceOf(address account) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ],
        this.provider
      );

      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
      ]);

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  /**
   * Deposit tokens to custodial wallet
   * Note: This method requires external funding - users must send tokens to their custodial wallet
   * The system no longer uses a main wallet for deposits
   */
  async depositTokens(userWalletAddress, amount, tokenContractAddress) {
    try {
      console.log(`Checking deposit of ${amount} tokens to ${userWalletAddress}`);
      
      // Check if the user's wallet has received the tokens
      const balance = await this.getTokenBalance(userWalletAddress, tokenContractAddress);
      
      return {
        success: true,
        message: 'Deposit verification completed',
        amount: amount,
        recipient: userWalletAddress,
        currentBalance: balance,
        type: 'deposit_verification',
        note: 'User must send tokens to their custodial wallet address'
      };
    } catch (error) {
      console.error('Error verifying deposit:', error);
      throw new Error(`Failed to verify deposit: ${error.message}`);
    }
  }

  /**
   * Withdraw tokens from custodial wallet to external address
   */
  async withdrawTokens(fromWalletPrivateKey, toAddress, amount, tokenContractAddress) {
    try {
      console.log(`Withdrawing ${amount} tokens from custodial wallet to ${toAddress}`);
      
      // Create wallet instance from private key
      const wallet = new ethers.Wallet(fromWalletPrivateKey, this.provider);
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenContractAddress,
        [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address account) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ],
        wallet
      );

      // Get decimals and convert amount
      const decimals = await tokenContract.decimals();
      const tokenAmount = ethers.parseUnits(amount.toString(), decimals);

      // Check balance
      const balance = await tokenContract.balanceOf(wallet.address);
      if (balance < tokenAmount) {
        throw new Error(`Insufficient balance. Available: ${ethers.formatUnits(balance, decimals)}, Required: ${amount}`);
      }

      // Estimate gas and send transaction
      const gasEstimate = await tokenContract.transfer.estimateGas(toAddress, tokenAmount);
      const feeData = await this.provider.getFeeData();
      const gasLimit = gasEstimate * 120n / 100n;

      const tx = await tokenContract.transfer(toAddress, tokenAmount, {
        gasLimit: gasLimit,
        gasPrice: feeData.gasPrice
      });

      console.log(`Withdrawal transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      const explorerUrl = `https://kxcoscan.com/tx/${tx.hash}`;
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        amount: amount,
        from: wallet.address,
        to: toAddress,
        type: 'withdrawal',
        explorerUrl: explorerUrl
      };
    } catch (error) {
      console.error('Error withdrawing tokens:', error);
      throw new Error(`Failed to withdraw tokens: ${error.message}`);
    }
  }

  /**
   * Distribute tokens from custodial wallet to multiple recipients
   */
  async distributeFromCustodialWallet(fromWalletPrivateKey, recipients, tokenContractAddress) {
    try {
      console.log(`Distributing tokens from custodial wallet to ${recipients.length} recipients`);
      
      const wallet = new ethers.Wallet(fromWalletPrivateKey, this.provider);
      const results = [];
      
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const tokensToDistribute = Math.floor(recipient.hrsWorked);
        
        try {
          console.log(`Processing recipient ${i + 1}/${recipients.length}: ${recipient.name}`);
          
          const result = await this.withdrawTokens(
            fromWalletPrivateKey,
            recipient.wallet,
            tokensToDistribute,
            tokenContractAddress
          );
          
          results.push({
            success: true,
            recipient: {
              name: recipient.name,
              email: recipient.email,
              id: recipient.id,
              wallet: recipient.wallet
            },
            distribution: {
              hoursWorked: recipient.hrsWorked,
              tokensDistributed: tokensToDistribute,
              rate: '1 token per hour'
            },
            transaction: result
          });
          
          console.log(`Successfully distributed ${tokensToDistribute} tokens to ${recipient.name}`);
          
        } catch (error) {
          console.error(`Failed to distribute tokens to ${recipient.name}:`, error);
          
          results.push({
            success: false,
            recipient: {
              name: recipient.name,
              email: recipient.email,
              id: recipient.id,
              wallet: recipient.wallet
            },
            distribution: {
              hoursWorked: recipient.hrsWorked,
              tokensDistributed: 0,
              rate: '1 token per hour'
            },
            error: error.message
          });
        }
      }
      
      const successfulCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      console.log(`Custodial distribution completed: ${successfulCount} successful, ${failedCount} failed`);
      
      return results;
    } catch (error) {
      console.error('Error in custodial distribution:', error);
      throw new Error(`Failed to distribute from custodial wallet: ${error.message}`);
    }
  }

  /**
   * Withdraw native KDA from custodial wallet
   */
  async withdrawNative(privateKey, toAddress, amount) {
    try {
      console.log(`Withdrawing ${amount} KDA from custodial wallet to ${toAddress}`);
      
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount.toString())
      });
      
      console.log(`Native withdrawal transaction sent: ${tx.hash}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        amount: amount,
        toAddress: toAddress,
        type: 'native'
      };
    } catch (error) {
      console.error('Error withdrawing native currency:', error);
      throw new Error(`Failed to withdraw native currency: ${error.message}`);
    }
  }
}

module.exports = new CustodialWalletService();
