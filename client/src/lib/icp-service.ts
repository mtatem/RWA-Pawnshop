// Real ICP blockchain integration for the RWA pawn platform
import { AuthClient } from "@dfinity/auth-client";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { AccountIdentifier } from "@dfinity/ledger-icp";

// ICP Ledger Canister Interface
export interface ICPLedgerInterface {
  account_balance: (args: { account: Uint8Array }) => Promise<{ e8s: bigint }>;
  transfer: (args: {
    memo: bigint;
    amount: { e8s: bigint };
    fee: { e8s: bigint };
    from_subaccount?: [Uint8Array] | [];
    to: Uint8Array;
    created_at_time?: [{ timestamp_nanos: bigint }] | [];
  }) => Promise<{ Ok: bigint } | { Err: any }>;
}

// ICP Ledger Canister ID (mainnet)
const ICP_LEDGER_CANISTER_ID = "rrkah-fqaaa-aaaaa-aaaaq-cai";

// Types
export interface ICPWallet {
  principalId: string;
  accountId: string;
  balance: number;
  connected: boolean;
  walletType: 'plug' | 'internetIdentity';
}

export interface ICPTransaction {
  hash?: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  memo?: string;
  blockHeight?: string;
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

// Utility functions
const principalToAccountId = (principal: Principal): Uint8Array => {
  // Use proper @dfinity/ledger-icp utility for correct account identifier derivation
  return AccountIdentifier.fromPrincipal({
    principal,
    subAccount: undefined, // default subaccount
  }).toUint8Array();
};

const accountIdToHex = (accountId: Uint8Array): string => {
  return Array.from(accountId)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Real ICP wallet service
export class ICPWalletService {
  private static instance: ICPWalletService;
  private wallet: ICPWallet | null = null;
  private authClient: AuthClient | null = null;
  private agent: HttpAgent | null = null;
  private ledgerActor: any = null;

  static getInstance(): ICPWalletService {
    if (!ICPWalletService.instance) {
      ICPWalletService.instance = new ICPWalletService();
    }
    return ICPWalletService.instance;
  }

  // Initialize auth client
  private async initAuthClient(): Promise<void> {
    if (!this.authClient) {
      this.authClient = await AuthClient.create({
        idleOptions: {
          idleTimeout: 1000 * 60 * 30, // 30 minutes
          disableDefaultIdleCallback: true,
        },
      });
    }
  }

  // Initialize agent and ledger actor
  private async initAgent(identity?: any): Promise<void> {
    this.agent = new HttpAgent({
      host: process.env.NODE_ENV === 'production' 
        ? 'https://ic0.app' 
        : 'https://ic0.app', // Use mainnet for now
      identity,
    });

    // In development, fetch root key
    if (process.env.NODE_ENV !== 'production') {
      await this.agent.fetchRootKey();
    }

    // Create ledger actor
    this.ledgerActor = Actor.createActor(
      ({ IDL }: { IDL: any }) => {
        const AccountIdentifier = IDL.Vec(IDL.Nat8);
        const Tokens = IDL.Record({ e8s: IDL.Nat64 });
        const TimeStamp = IDL.Record({ timestamp_nanos: IDL.Nat64 });
        const Memo = IDL.Nat64;
        const SubAccount = IDL.Vec(IDL.Nat8);
        
        return IDL.Service({
          account_balance: IDL.Func(
            [IDL.Record({ account: AccountIdentifier })],
            [Tokens],
            ['query']
          ),
          transfer: IDL.Func(
            [IDL.Record({
              memo: Memo,
              amount: Tokens,
              fee: Tokens,
              from_subaccount: IDL.Opt(SubAccount),
              to: AccountIdentifier,
              created_at_time: IDL.Opt(TimeStamp),
            })],
            [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })],
            []
          ),
        });
      },
      {
        agent: this.agent,
        canisterId: ICP_LEDGER_CANISTER_ID,
      }
    );
  }

  // Check if Plug wallet is available
  isPlugAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).ic !== 'undefined' && 
           typeof (window as any).ic.plug !== 'undefined';
  }

  // Connect to Plug wallet
  async connectPlug(): Promise<ICPWallet> {
    if (!this.isPlugAvailable()) {
      throw new Error('Plug wallet is not installed. Please install the Plug browser extension.');
    }

    try {
      const connected = await (window as any).ic.plug.requestConnect({
        whitelist: [ICP_LEDGER_CANISTER_ID],
        host: process.env.NODE_ENV === 'production' 
          ? 'https://ic0.app' 
          : 'https://ic0.app',
      });

      if (!connected) {
        throw new Error('Failed to connect to Plug wallet');
      }

      const principalId = await (window as any).ic.plug.getPrincipal();
      const principal = Principal.fromText(principalId.toString());
      const accountId = principalToAccountId(principal);
      const accountIdHex = accountIdToHex(accountId);

      // Get balance
      const balance = await this.getBalanceFromPlug(accountId);

      this.wallet = {
        principalId: principalId.toString(),
        accountId: accountIdHex,
        balance: balance,
        connected: true,
        walletType: 'plug',
      };

      return this.wallet;
    } catch (error) {
      console.error('Error connecting to Plug:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to connect to Plug wallet');
    }
  }

  // Connect to Internet Identity
  async connectInternetIdentity(): Promise<ICPWallet> {
    try {
      await this.initAuthClient();
      
      if (!this.authClient) {
        throw new Error('Failed to initialize auth client');
      }

      await new Promise<void>((resolve, reject) => {
        this.authClient!.login({
          identityProvider: process.env.NODE_ENV === 'production'
            ? 'https://identity.ic0.app/'
            : 'https://identity.ic0.app/',
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(error || 'Authentication failed')),
        });
      });

      const identity = this.authClient.getIdentity();
      const principal = identity.getPrincipal();
      
      if (principal.isAnonymous()) {
        throw new Error('Anonymous principal detected. Please authenticate properly.');
      }

      await this.initAgent(identity);

      const accountId = principalToAccountId(principal);
      const accountIdHex = accountIdToHex(accountId);

      // Get balance
      const balance = await this.getBalanceFromLedger(accountId);

      this.wallet = {
        principalId: principal.toString(),
        accountId: accountIdHex,
        balance: balance,
        connected: true,
        walletType: 'internetIdentity',
      };

      return this.wallet;
    } catch (error) {
      console.error('Error connecting to Internet Identity:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to connect to Internet Identity');
    }
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<void> {
    if (this.wallet?.walletType === 'plug' && this.isPlugAvailable()) {
      await (window as any).ic.plug.disconnect();
    } else if (this.wallet?.walletType === 'internetIdentity' && this.authClient) {
      await this.authClient.logout();
    }

    this.wallet = null;
    this.authClient = null;
    this.agent = null;
    this.ledgerActor = null;
  }

  // Get connected wallet
  getConnectedWallet(): ICPWallet | null {
    return this.wallet;
  }

  // Get balance from Plug
  private async getBalanceFromPlug(accountId: Uint8Array, suppressErrors: boolean = false): Promise<number> {
    try {
      const balance = await (window as any).ic.plug.requestBalance();
      return balance[0]?.amount ? Number(balance[0].amount) / 100000000 : 0; // Convert e8s to ICP
    } catch (error) {
      // Suppress errors during connection restoration to prevent unhandled promise rejections
      if (!suppressErrors) {
        console.error('Error getting balance from Plug:', error);
      }
      return 0;
    }
  }

  // Get balance from ledger
  private async getBalanceFromLedger(accountId: Uint8Array): Promise<number> {
    try {
      if (!this.ledgerActor) {
        throw new Error('Ledger actor not initialized');
      }

      const result = await this.ledgerActor.account_balance({
        account: accountId,
      });

      return Number(result.e8s) / 100000000; // Convert e8s to ICP
    } catch (error) {
      console.error('Error getting balance from ledger:', error);
      return 0;
    }
  }

  // Get balance for any address
  async getBalance(principalId?: string): Promise<number> {
    try {
      if (!principalId && !this.wallet) {
        throw new Error('No wallet connected and no principal ID provided');
      }

      const targetPrincipal = principalId 
        ? Principal.fromText(principalId)
        : Principal.fromText(this.wallet!.principalId);

      const accountId = principalToAccountId(targetPrincipal);

      if (this.wallet?.walletType === 'plug' && !principalId) {
        return this.getBalanceFromPlug(accountId);
      } else {
        // Initialize agent if needed
        if (!this.ledgerActor) {
          await this.initAgent();
        }
        return this.getBalanceFromLedger(accountId);
      }
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  // Send transaction
  async sendTransaction(
    to: string,
    amount: number,
    type: 'fee_payment' | 'loan_disbursement' | 'redemption_payment' | 'bid_payment',
    memo?: string
  ): Promise<ICPTransaction> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    if (this.wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    try {
      const transaction: ICPTransaction = {
        from: this.wallet.principalId,
        to,
        amount,
        currency: 'ICP',
        status: 'pending',
        timestamp: new Date(),
        memo,
      };

      if (this.wallet.walletType === 'plug') {
        // Use Plug wallet to send transaction
        const result = await (window as any).ic.plug.requestTransfer({
          to,
          amount: Math.floor(amount * 100000000), // Convert to e8s
          opts: {
            fee: 10000, // Standard ICP fee in e8s
            memo: memo ? BigInt(memo) : BigInt(0),
          },
        });

        if (result.height) {
          transaction.hash = result.hash || `${result.height}`;
          transaction.blockHeight = result.height.toString();
          transaction.status = 'confirmed';
        }
      } else {
        // Use Internet Identity / Ledger
        if (!this.ledgerActor) {
          throw new Error('Ledger actor not initialized');
        }

        const toPrincipal = Principal.fromText(to);
        const toAccountId = principalToAccountId(toPrincipal);

        const result = await this.ledgerActor.transfer({
          memo: BigInt(memo || 0),
          amount: { e8s: BigInt(Math.floor(amount * 100000000)) },
          fee: { e8s: BigInt(10000) },
          from_subaccount: [],
          to: toAccountId,
          created_at_time: [],
        });

        if ('Ok' in result) {
          transaction.hash = result.Ok.toString();
          transaction.blockHeight = result.Ok.toString();
          transaction.status = 'confirmed';
        } else {
          throw new Error(result.Err || 'Transaction failed');
        }
      }

      // Update local balance
      this.wallet.balance -= (amount + 0.0001); // Include fee

      return transaction;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(error instanceof Error ? error.message : 'Transaction failed');
    }
  }

  // Validate wallet address (principal ID)
  async validateWalletAddress(address: string): Promise<boolean> {
    try {
      Principal.fromText(address);
      return true;
    } catch {
      return false;
    }
  }

  // Get transaction history (stub - would require indexing service)
  async getTransactionHistory(principalId: string): Promise<ICPTransaction[]> {
    // In a real implementation, you would query an indexing service
    // For now, return empty array as transaction history requires external indexing
    console.warn('Transaction history requires external indexing service');
    return [];
  }

  // Check if wallet is connected
  async isConnected(): Promise<boolean> {
    if (!this.wallet) return false;

    try {
      if (this.wallet.walletType === 'plug' && this.isPlugAvailable()) {
        return await (window as any).ic.plug.isConnected();
      } else if (this.wallet.walletType === 'internetIdentity') {
        await this.initAuthClient();
        return this.authClient ? await this.authClient.isAuthenticated() : false;
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }

    return false;
  }

  // Restore connection on page load
  async restoreConnection(): Promise<ICPWallet | null> {
    try {
      // Try to restore Plug connection
      if (this.isPlugAvailable()) {
        const isConnected = await (window as any).ic.plug.isConnected();
        if (isConnected) {
          // Don't call requestConnect() again, just rebuild the wallet state
          const principalId = await (window as any).ic.plug.getPrincipal();
          const principal = Principal.fromText(principalId.toString());
          const accountId = principalToAccountId(principal);
          const accountIdHex = accountIdToHex(accountId);

          // Get balance without triggering new connection (suppress errors to prevent unhandled rejections)
          const balance = await this.getBalanceFromPlug(accountId, true);

          this.wallet = {
            principalId: principalId.toString(),
            accountId: accountIdHex,
            balance: balance,
            connected: true,
            walletType: 'plug',
          };

          return this.wallet;
        }
      }

      // Try to restore Internet Identity connection
      await this.initAuthClient();
      if (this.authClient && await this.authClient.isAuthenticated()) {
        const identity = this.authClient.getIdentity();
        const principal = identity.getPrincipal();
        
        if (!principal.isAnonymous()) {
          await this.initAgent(identity);
          
          const accountId = principalToAccountId(principal);
          const accountIdHex = accountIdToHex(accountId);

          // Get balance
          const balance = await this.getBalanceFromLedger(accountId);

          this.wallet = {
            principalId: principal.toString(),
            accountId: accountIdHex,
            balance: balance,
            connected: true,
            walletType: 'internetIdentity',
          };

          return this.wallet;
        }
      }
    } catch (error) {
      console.error('Error restoring connection:', error);
    }

    return null;
  }
}

// RWA Asset Service (placeholder - would integrate with actual canister)
export class RWAAssetService {
  private static instance: RWAAssetService;
  
  static getInstance(): RWAAssetService {
    if (!RWAAssetService.instance) {
      RWAAssetService.instance = new RWAAssetService();
    }
    return RWAAssetService.instance;
  }

  // These would be implemented with actual ICP canisters
  async mintRWAAsset(
    name: string,
    description: string,
    imageUrl: string,
    owner: string,
    attributes: Array<{ trait_type: string; value: string }>
  ): Promise<RWAAsset> {
    throw new Error('RWA minting requires canister implementation');
  }

  async transferAsset(assetId: string, from: string, to: string): Promise<boolean> {
    throw new Error('RWA transfer requires canister implementation');
  }

  async getAssetsByOwner(owner: string): Promise<RWAAsset[]> {
    throw new Error('RWA query requires canister implementation');
  }

  async getAsset(assetId: string): Promise<RWAAsset | null> {
    throw new Error('RWA query requires canister implementation');
  }
}

// Bridge Service (placeholder - would integrate with cross-chain infrastructure)
export class ICPBridgeService {
  private static instance: ICPBridgeService;

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
    throw new Error('Cross-chain bridge requires infrastructure implementation');
  }

  async getBridgeStatus(bridgeId: string): Promise<any> {
    throw new Error('Bridge status requires infrastructure implementation');
  }

  async getSupportedChains(): Promise<string[]> {
    return ["ethereum", "polygon", "bsc", "solana"];
  }
}

// Loan calculation utilities (kept from mock)
export class LoanCalculator {
  static readonly MAX_LOAN_TO_VALUE_RATIO = 0.7; // 70%
  static readonly LOAN_TERM_DAYS = 90;
  static readonly PAWN_FEE_ICP = 5;

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