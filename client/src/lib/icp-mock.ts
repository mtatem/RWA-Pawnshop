// Mock ICP blockchain integration for the RWA pawn platform
// In production, this would be replaced with actual ICP SDK calls

export interface ICPWallet {
  address: string;
  balance: number;
  connected: boolean;
}

export interface ICPTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

export interface RWAAsset {
  id: string;
  tokenId: string;
  contractAddress: string;
  owner: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
}

// Mock ICP wallet service
export class ICPWalletService {
  private static instance: ICPWalletService;
  private wallet: ICPWallet | null = null;
  private transactions: ICPTransaction[] = [];

  static getInstance(): ICPWalletService {
    if (!ICPWalletService.instance) {
      ICPWalletService.instance = new ICPWalletService();
    }
    return ICPWalletService.instance;
  }

  async connectWallet(): Promise<ICPWallet> {
    // Simulate wallet connection
    await this.delay(1000);
    
    this.wallet = {
      address: `icp_${Math.random().toString(36).substring(2, 15)}`,
      balance: Math.floor(Math.random() * 1000) + 100, // Random balance between 100-1100 ICP
      connected: true,
    };
    
    return this.wallet;
  }

  async disconnectWallet(): Promise<void> {
    this.wallet = null;
  }

  getConnectedWallet(): ICPWallet | null {
    return this.wallet;
  }

  async getBalance(address: string): Promise<number> {
    await this.delay(500);
    return this.wallet?.balance || 0;
  }

  async sendTransaction(
    to: string,
    amount: number,
    type: 'fee_payment' | 'loan_disbursement' | 'redemption_payment' | 'bid_payment'
  ): Promise<ICPTransaction> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    if (this.wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    await this.delay(2000); // Simulate transaction time

    const transaction: ICPTransaction = {
      hash: `icp_tx_${Math.random().toString(36).substring(2, 15)}`,
      from: this.wallet.address,
      to,
      amount,
      currency: 'ICP',
      status: 'pending',
      timestamp: new Date(),
    };

    this.transactions.push(transaction);

    // Simulate transaction confirmation after a delay
    setTimeout(() => {
      transaction.status = 'confirmed';
      if (this.wallet) {
        this.wallet.balance -= amount;
      }
    }, 3000);

    return transaction;
  }

  async getTransactionHistory(address: string): Promise<ICPTransaction[]> {
    await this.delay(500);
    return this.transactions.filter(tx => tx.from === address || tx.to === address);
  }

  async validateWalletAddress(address: string): Promise<boolean> {
    // Mock ICP address validation
    const icpAddressPattern = /^icp_[a-zA-Z0-9]{10,50}$/;
    return icpAddressPattern.test(address);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Mock RWA asset management
export class RWAAssetService {
  private static instance: RWAAssetService;
  private assets: Map<string, RWAAsset> = new Map();
  private mainWallet = "icp_main_pawn_wallet_12345";

  static getInstance(): RWAAssetService {
    if (!RWAAssetService.instance) {
      RWAAssetService.instance = new RWAAssetService();
    }
    return RWAAssetService.instance;
  }

  async mintRWAAsset(
    name: string,
    description: string,
    imageUrl: string,
    owner: string,
    attributes: Array<{ trait_type: string; value: string }>
  ): Promise<RWAAsset> {
    await this.delay(2000);

    const asset: RWAAsset = {
      id: `rwa_${Math.random().toString(36).substring(2, 15)}`,
      tokenId: Math.floor(Math.random() * 1000000).toString(),
      contractAddress: "icp_rwa_contract_main",
      owner,
      metadata: {
        name,
        description,
        image: imageUrl,
        attributes,
      },
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  async transferAsset(assetId: string, from: string, to: string): Promise<boolean> {
    await this.delay(1500);

    const asset = this.assets.get(assetId);
    if (!asset || asset.owner !== from) {
      throw new Error('Asset not found or not owned by sender');
    }

    asset.owner = to;
    this.assets.set(assetId, asset);
    return true;
  }

  async transferToMainWallet(assetId: string, from: string): Promise<boolean> {
    return this.transferAsset(assetId, from, this.mainWallet);
  }

  async transferFromMainWallet(assetId: string, to: string): Promise<boolean> {
    return this.transferAsset(assetId, this.mainWallet, to);
  }

  async getAssetsByOwner(owner: string): Promise<RWAAsset[]> {
    await this.delay(500);
    return Array.from(this.assets.values()).filter(asset => asset.owner === owner);
  }

  async getAsset(assetId: string): Promise<RWAAsset | null> {
    await this.delay(300);
    return this.assets.get(assetId) || null;
  }

  getMainWalletAddress(): string {
    return this.mainWallet;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Cross-chain bridge simulation
export class ICPBridgeService {
  private static instance: ICPBridgeService;
  private bridgeTransactions: Map<string, any> = new Map();

  static getInstance(): ICPBridgeService {
    if (!ICPBridgeService.instance) {
      ICPBridgeService.instance = new ICPBridgeService();
    }
    return ICPBridgeService.instance;
  }

  async initiateBridge(
    sourceChain: string,
    contractAddress: string,
    destinationAddress: string,
    amount?: number
  ): Promise<{
    bridgeId: string;
    sourceTxHash: string;
    estimatedCompletionTime: Date;
  }> {
    await this.delay(2000);

    const bridgeId = `bridge_${Math.random().toString(36).substring(2, 15)}`;
    const sourceTxHash = `${sourceChain}_tx_${Math.random().toString(36).substring(2, 15)}`;
    const estimatedCompletionTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const bridgeTransaction = {
      bridgeId,
      sourceChain,
      destinationChain: "ICP",
      contractAddress,
      destinationAddress,
      amount,
      sourceTxHash,
      destinationTxHash: null as string | null,
      status: "processing",
      createdAt: new Date(),
      estimatedCompletionTime,
    };

    this.bridgeTransactions.set(bridgeId, bridgeTransaction);

    // Simulate bridge completion after a delay
    setTimeout(() => {
      bridgeTransaction.status = "completed";
      bridgeTransaction.destinationTxHash = `icp_tx_${Math.random().toString(36).substring(2, 15)}`;
    }, 10000); // 10 seconds for demo

    return {
      bridgeId,
      sourceTxHash,
      estimatedCompletionTime,
    };
  }

  async getBridgeStatus(bridgeId: string): Promise<any> {
    await this.delay(300);
    return this.bridgeTransactions.get(bridgeId);
  }

  async getSupportedChains(): Promise<string[]> {
    return ["ethereum", "polygon", "bsc", "solana"];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Loan calculation utilities
export class LoanCalculator {
  static readonly MAX_LOAN_TO_VALUE_RATIO = 0.7; // 70%
  static readonly LOAN_TERM_DAYS = 90;
  static readonly PAWN_FEE_ICP = 2;

  static calculateMaxLoanAmount(assetValue: number): number {
    return Math.floor(assetValue * this.MAX_LOAN_TO_VALUE_RATIO);
  }

  static calculateExpiryDate(startDate: Date = new Date()): Date {
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + this.LOAN_TERM_DAYS);
    return expiryDate;
  }

  static calculateDaysRemaining(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static isLoanExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  static calculateTimeProgress(startDate: Date, expiryDate: Date): number {
    const now = new Date();
    const totalTime = expiryDate.getTime() - startDate.getTime();
    const elapsedTime = now.getTime() - startDate.getTime();
    return Math.min((elapsedTime / totalTime) * 100, 100);
  }
}

// Export singleton instances for easy use
export const icpWallet = ICPWalletService.getInstance();
export const rwaAssets = RWAAssetService.getInstance();
export const icpBridge = ICPBridgeService.getInstance();
