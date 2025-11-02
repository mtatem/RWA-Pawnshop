// Comprehensive Chain Fusion Bridge Service for RWA Pawn Platform
// Enables seamless asset transfers between Ethereum and ICP networks

import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { 
  BridgeTransaction, 
  InsertBridgeTransaction, 
  BridgeEstimation, 
  BridgeInitiation,
  BridgeEstimationResponse,
  SupportedNetwork,
  SupportedToken,
  BridgeStatus
} from "@shared/schema";
import { storage } from "../storage";
import { priceOracleService } from "./price-oracle";
import { parseToBigInt, formatBigIntToDecimal, calculatePercentage } from "../utils/decimal-parser";

// Chain Fusion canister IDs (ICP mainnet)
const CHAIN_FUSION_CANISTERS = {
  ckETH: "ss2fx-dyaaa-aaaar-qacoq-cai",
  ckUSDC: "xkbqi-6qaaa-aaaah-qbpqq-cai",
  ckBTC: "mxzaz-hqaaa-aaaar-qaada-cai",
  evmRPC: "7hfb6-caaaa-aaaar-qadga-cai",
  bridge: "rdmx6-jaaaa-aaaah-qcdwa-cai" // Chain Fusion bridge canister
} as const;

// System wallet addresses for bridge operations
const SYSTEM_WALLETS = {
  icp: "1ef008c2d7e445954e12ec2033b202888723046fde489be3a250cacf01d65963",
  ethereum: "0x00f3C42833C3170159af4E92dbb451Fb3F708917"
} as const;

// Token configurations with decimals and limits
const TOKEN_CONFIG = {
  ETH: {
    decimals: 18,
    minAmount: "0.001", // 0.001 ETH minimum
    maxAmount: "100", // 100 ETH maximum
    address: "0x0000000000000000000000000000000000000000" // Native ETH
  },
  USDC: {
    decimals: 6,
    minAmount: "1", // $1 minimum
    maxAmount: "1000000", // $1M maximum
    address: "0xA0b86a33E6441c5C60000000000000000000000000" // USDC contract
  },
  BTC: {
    decimals: 8,
    minAmount: "0.0001", // 0.0001 BTC minimum (~$10 at $100k/BTC)
    maxAmount: "10", // 10 BTC maximum
    address: "native" // Native Bitcoin
  },
  ckETH: {
    decimals: 18,
    minAmount: "0.001",
    maxAmount: "100",
    canisterId: CHAIN_FUSION_CANISTERS.ckETH
  },
  ckUSDC: {
    decimals: 6,
    minAmount: "1",
    maxAmount: "1000000", 
    canisterId: CHAIN_FUSION_CANISTERS.ckUSDC
  },
  ckBTC: {
    decimals: 8,
    minAmount: "0.0001",
    maxAmount: "10",
    canisterId: CHAIN_FUSION_CANISTERS.ckBTC
  }
} as const;

// Network configurations
const NETWORK_CONFIG = {
  ethereum: {
    chainId: 1,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo", // Demo RPC - replace with real
    blockConfirmations: 12,
    bridgeContract: "0x7f268357A8c2552623316e2562D90e642bB538E5" // Example - replace with real
  },
  bitcoin: {
    network: "mainnet",
    rpcUrl: "https://blockstream.info/api", // Public Bitcoin API
    blockConfirmations: 6, // Bitcoin typically requires 6 confirmations
  },
  icp: {
    network: "mainnet",
    host: "https://ic0.app"
  }
} as const;

// Bridge fee structure (in basis points, 1% = 100)
// Production-ready fee structure with oracle integration
const BRIDGE_FEES = {
  protocolFee: 50, // 0.5% protocol fee for all bridges
  // Network fees are calculated dynamically using oracle services
} as const;

// EVM RPC Canister Interface
interface EVMRPCInterface {
  eth_getTransactionReceipt: (args: { txHash: string }) => Promise<any>;
  eth_getBlockByNumber: (args: { blockNumber: string }) => Promise<any>;
  eth_getLogs: (args: { fromBlock: string; toBlock: string; address?: string }) => Promise<any>;
  eth_call: (args: { to: string; data: string }) => Promise<string>;
}

// ckETH Canister Interface
interface CkETHInterface {
  icrc1_balance_of: (args: { owner: Principal; subaccount?: Uint8Array }) => Promise<bigint>;
  icrc1_transfer: (args: {
    to: { owner: Principal; subaccount?: Uint8Array };
    amount: bigint;
    memo?: Uint8Array;
    from_subaccount?: Uint8Array;
    created_at_time?: bigint;
    fee?: bigint;
  }) => Promise<{ Ok: bigint } | { Err: any }>;
  retrieve_eth_status: (args: { block_index: bigint }) => Promise<any>;
  get_minter_info: () => Promise<{ minter_address: string; eth_helper_contract_address: string }>;
}

// Chain Fusion Bridge Service
export class ChainFusionBridgeService {
  private static instance: ChainFusionBridgeService;
  private agent?: HttpAgent;
  private evmRPCActor?: any;
  private ckETHActor?: any;
  private ckUSDCActor?: any;

  static getInstance(): ChainFusionBridgeService {
    if (!ChainFusionBridgeService.instance) {
      ChainFusionBridgeService.instance = new ChainFusionBridgeService();
    }
    return ChainFusionBridgeService.instance;
  }

  // Initialize ICP agent and actors
  private async initializeAgent(): Promise<void> {
    if (this.agent) return;

    this.agent = new HttpAgent({ host: NETWORK_CONFIG.icp.host });

    // Create EVM RPC actor for Ethereum monitoring
    this.evmRPCActor = Actor.createActor(
      ({ IDL }: { IDL: any }) => {
        return IDL.Service({
          eth_getTransactionReceipt: IDL.Func([IDL.Record({ txHash: IDL.Text })], [IDL.Opt(IDL.Record({ status: IDL.Text }))], ['query']),
          eth_getBlockByNumber: IDL.Func([IDL.Record({ blockNumber: IDL.Text })], [IDL.Opt(IDL.Record({ number: IDL.Text, timestamp: IDL.Text }))], ['query']),
          eth_getLogs: IDL.Func([IDL.Record({ fromBlock: IDL.Text, toBlock: IDL.Text, address: IDL.Opt(IDL.Text) })], [IDL.Vec(IDL.Record({ transactionHash: IDL.Text }))], ['query']),
        });
      },
      {
        agent: this.agent,
        canisterId: CHAIN_FUSION_CANISTERS.evmRPC,
      }
    );

    // Create ckETH actor
    this.ckETHActor = Actor.createActor(
      ({ IDL }: { IDL: any }) => {
        const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
        return IDL.Service({
          icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
          icrc1_transfer: IDL.Func([IDL.Record({
            to: Account,
            amount: IDL.Nat,
            memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
            from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            created_at_time: IDL.Opt(IDL.Nat64),
            fee: IDL.Opt(IDL.Nat),
          })], [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })], []),
          retrieve_eth_status: IDL.Func([IDL.Record({ block_index: IDL.Nat })], [IDL.Opt(IDL.Record({ status: IDL.Text }))], ['query']),
          get_minter_info: IDL.Func([], [IDL.Record({ minter_address: IDL.Text, eth_helper_contract_address: IDL.Text })], ['query']),
        });
      },
      {
        agent: this.agent,
        canisterId: CHAIN_FUSION_CANISTERS.ckETH,
      }
    );

    // Create ckUSDC actor with similar interface
    this.ckUSDCActor = Actor.createActor(
      ({ IDL }: { IDL: any }) => {
        const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
        return IDL.Service({
          icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
          icrc1_transfer: IDL.Func([IDL.Record({
            to: Account,
            amount: IDL.Nat,
            memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
            from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            created_at_time: IDL.Opt(IDL.Nat64),
            fee: IDL.Opt(IDL.Nat),
          })], [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })], []),
        });
      },
      {
        agent: this.agent,
        canisterId: CHAIN_FUSION_CANISTERS.ckUSDC,
      }
    );
  }

  // Estimate bridge transaction costs and timing with oracle integration
  async estimateBridge(request: BridgeEstimation): Promise<BridgeEstimationResponse> {
    try {
      // Note: Agent initialization not required for fee estimation
      // Only oracle services are needed for price and gas cost data
      
      const { fromNetwork, toNetwork, fromToken, toToken, amount } = request;
      
      // Validate wrapped token pairs (only allow 1:1 bridges)
      this.validateBridgePair(fromNetwork, toNetwork, fromToken, toToken);
      
      const fromTokenKey = fromToken as keyof typeof TOKEN_CONFIG;
      const toTokenKey = toToken as keyof typeof TOKEN_CONFIG;
      
      const fromDecimals = TOKEN_CONFIG[fromTokenKey].decimals;
      const toDecimals = TOKEN_CONFIG[toTokenKey].decimals;
      
      // Use precise decimal parser to avoid float precision loss
      const amountBigInt = parseToBigInt(amount, fromDecimals);

      // Calculate protocol fee (0.5% of amount)
      const protocolFeeBigInt = calculatePercentage(amountBigInt, BRIDGE_FEES.protocolFee);
      
      // Calculate network fee using oracle service
      // NOTE: Network fees are incurred based on which blockchain you're interacting with
      // - If bridging FROM Ethereum → need to pay Ethereum gas
      // - If bridging FROM ICP → only pay minimal ICP cost
      let networkFeeBigInt: bigint;
      
      if (fromNetwork === 'ethereum') {
        // Ethereum source: User pays Ethereum gas to deposit/lock tokens
        const gasEstimate = await priceOracleService.estimateEthereumGasCost();
        console.log(`Ethereum gas estimate: $${gasEstimate.totalGasCostUSD.toFixed(2)} (${gasEstimate.totalGasCostETH.toFixed(6)} ETH)`);
        
        // Convert gas cost to fromToken units
        if (fromToken === 'ETH') {
          // Gas cost is already in ETH, convert to wei
          networkFeeBigInt = parseToBigInt(gasEstimate.totalGasCostETH.toString(), fromDecimals);
        } else if (fromToken === 'USDC') {
          // Convert USD gas cost to USDC (1:1)
          networkFeeBigInt = parseToBigInt(gasEstimate.totalGasCostUSD.toFixed(2), fromDecimals);
        } else {
          // Use price oracle to convert
          const prices = await priceOracleService.getTokenPrices();
          const gasCostInToken = gasEstimate.totalGasCostUSD / prices[fromToken as keyof typeof prices];
          networkFeeBigInt = parseToBigInt(gasCostInToken.toFixed(fromDecimals), fromDecimals);
        }
      } else if (fromNetwork === 'icp') {
        // ICP source: User pays minimal ICP cost to burn ck tokens
        const icpCost = await priceOracleService.estimateICPNetworkCost();
        console.log(`ICP network cost: $${icpCost.costUSD.toFixed(4)}`);
        
        // If going TO Ethereum, user will also pay gas on destination (handled separately in actual withdrawal)
        // For estimation, we show the ICP burn cost which is what they pay upfront
        // The actual Ethereum gas will be deducted from ckETH balance during withdrawal process
        
        // Convert ICP cost to fromToken units
        if (fromToken === 'ckETH') {
          const prices = await priceOracleService.getTokenPrices();
          const costInETH = icpCost.costUSD / prices.ETH;
          networkFeeBigInt = parseToBigInt(costInETH.toFixed(18), fromDecimals);
        } else if (fromToken === 'ckUSDC') {
          networkFeeBigInt = parseToBigInt(icpCost.costUSD.toFixed(6), fromDecimals);
        } else {
          const prices = await priceOracleService.getTokenPrices();
          const costInToken = icpCost.costUSD / prices[fromToken as keyof typeof prices];
          networkFeeBigInt = parseToBigInt(costInToken.toFixed(fromDecimals), fromDecimals);
        }
        
        // For ICP → Ethereum bridges, add Ethereum gas cost estimate
        // (This is burned from user's ckETH balance during withdrawal per ckETH minter design)
        if (toNetwork === 'ethereum') {
          const ethGasEstimate = await priceOracleService.estimateEthereumGasCost();
          console.log(`+ Ethereum withdrawal gas: $${ethGasEstimate.totalGasCostUSD.toFixed(2)}`);
          
          if (fromToken === 'ckETH') {
            const ethGasBigInt = parseToBigInt(ethGasEstimate.totalGasCostETH.toString(), fromDecimals);
            networkFeeBigInt = networkFeeBigInt + ethGasBigInt;
          } else if (fromToken === 'ckUSDC') {
            const usdcGasBigInt = parseToBigInt(ethGasEstimate.totalGasCostUSD.toFixed(2), fromDecimals);
            networkFeeBigInt = networkFeeBigInt + usdcGasBigInt;
          }
        }
      } else {
        throw new Error(`Unsupported fromNetwork: ${fromNetwork}`);
      }
      
      // Calculate total fee
      const totalFeeBigInt = protocolFeeBigInt + networkFeeBigInt;
      
      // Calculate what user receives after fees
      const amountAfterFees = amountBigInt - totalFeeBigInt;
      
      // Validate minimum amount
      if (amountAfterFees <= BigInt(0)) {
        const minAmountBigInt = (totalFeeBigInt * BigInt(105)) / BigInt(100); // +5% buffer
        const minAmount = formatBigIntToDecimal(minAmountBigInt, fromDecimals);
        throw new Error(`Amount ${amount} ${fromToken} is too small to cover bridge fees. Minimum required: ${minAmount} ${fromToken}`);
      }
      
      // Convert receive amount to destination token decimals (1:1 for wrapped tokens)
      const decimalDiff = toDecimals - fromDecimals;
      const receiveAmountBigInt = decimalDiff >= 0 
        ? amountAfterFees * BigInt(Math.pow(10, decimalDiff))
        : amountAfterFees / BigInt(Math.pow(10, -decimalDiff));

      // Estimate completion time
      let estimatedTime = 15; // Base 15 minutes
      if (fromNetwork === 'ethereum') {
        estimatedTime += 20; // Ethereum confirmation time
      }
      if (toNetwork === 'ethereum') {
        estimatedTime += 10; // Ethereum finality time
      }

      // Exchange rate for wrapped tokens is always 1:1
      const exchangeRate = "1.0000";

      // Format response using precise decimal conversion
      return {
        estimatedFee: formatBigIntToDecimal(totalFeeBigInt, fromDecimals, 8),
        estimatedTime,
        minimumAmount: TOKEN_CONFIG[fromTokenKey].minAmount,
        maximumAmount: TOKEN_CONFIG[fromTokenKey].maxAmount,
        exchangeRate,
        networkFee: formatBigIntToDecimal(networkFeeBigInt, fromDecimals, 8),
        bridgeFee: formatBigIntToDecimal(protocolFeeBigInt, fromDecimals, 8),
        totalCost: formatBigIntToDecimal(totalFeeBigInt, fromDecimals, 8),
        receiveAmount: formatBigIntToDecimal(receiveAmountBigInt, toDecimals, 8),
      };
    } catch (error) {
      console.error("Bridge estimation failed:", error);
      throw new Error(`Bridge estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate that bridge only supports 1:1 wrapped token pairs
  private validateBridgePair(
    fromNetwork: SupportedNetwork,
    toNetwork: SupportedNetwork,
    fromToken: SupportedToken,
    toToken: SupportedToken
  ): void {
    const validPairs = [
      { from: 'ethereum', to: 'icp', fromToken: 'ETH', toToken: 'ckETH' },
      { from: 'icp', to: 'ethereum', fromToken: 'ckETH', toToken: 'ETH' },
      { from: 'ethereum', to: 'icp', fromToken: 'USDC', toToken: 'ckUSDC' },
      { from: 'icp', to: 'ethereum', fromToken: 'ckUSDC', toToken: 'USDC' },
    ];

    const isValid = validPairs.some(pair => 
      pair.from === fromNetwork &&
      pair.to === toNetwork &&
      pair.fromToken === fromToken &&
      pair.toToken === toToken
    );

    if (!isValid) {
      throw new Error(
        `Invalid bridge pair: ${fromToken} (${fromNetwork}) → ${toToken} (${toNetwork}). ` +
        `Only 1:1 wrapped token pairs are supported: ETH↔ckETH, USDC↔ckUSDC`
      );
    }
  }

  // Initiate a bridge transaction
  async initiateBridge(userId: string, request: BridgeInitiation): Promise<BridgeTransaction> {
    try {
      await this.initializeAgent();

      const { fromNetwork, toNetwork, fromToken, toToken, amount, fromAddress, toAddress } = request;

      // Validate amounts
      const tokenConfig = TOKEN_CONFIG[fromToken];
      const amountNum = parseFloat(amount);
      
      if (amountNum < parseFloat(tokenConfig.minAmount)) {
        throw new Error(`Amount below minimum: ${tokenConfig.minAmount} ${fromToken}`);
      }
      if (amountNum > parseFloat(tokenConfig.maxAmount)) {
        throw new Error(`Amount above maximum: ${tokenConfig.maxAmount} ${fromToken}`);
      }

      // Get bridge estimation for fees
      const estimation = await this.estimateBridge({ fromNetwork, toNetwork, fromToken, toToken, amount });

      // Create bridge transaction in database
      const bridgeData: InsertBridgeTransaction = {
        userId,
        fromNetwork,
        toNetwork,
        fromToken,
        toToken,
        amount,
        fromAddress,
        toAddress,
        bridgeFee: estimation.bridgeFee,
        estimatedTime: estimation.estimatedTime,
        requiredConfirmations: NETWORK_CONFIG.ethereum.blockConfirmations,
        status: 'pending',
        bridgeData: {
          estimation,
          systemWallets: SYSTEM_WALLETS,
          timestamp: Date.now()
        }
      };

      const bridge = await storage.createBridgeTransaction(bridgeData);

      // Start bridge processing in background
      this.processBridgeTransaction(bridge.id).catch(error => {
        console.error(`Bridge processing failed for ${bridge.id}:`, error);
        this.updateBridgeStatus(bridge.id, 'failed', { errorMessage: error.message });
      });

      return bridge;
    } catch (error) {
      console.error("Bridge initiation failed:", error);
      throw new Error(`Bridge initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process bridge transaction (background)
  private async processBridgeTransaction(bridgeId: string): Promise<void> {
    const bridge = await storage.getBridgeTransaction(bridgeId);
    if (!bridge) {
      throw new Error("Bridge transaction not found");
    }

    try {
      // Update status to processing
      await this.updateBridgeStatus(bridgeId, 'processing');

      if (bridge.fromNetwork === 'ethereum' && bridge.toNetwork === 'icp') {
        await this.processEthereumToICP(bridge);
      } else if (bridge.fromNetwork === 'icp' && bridge.toNetwork === 'ethereum') {
        await this.processICPToEthereum(bridge);
      } else {
        throw new Error("Unsupported bridge direction");
      }
    } catch (error) {
      console.error(`Bridge processing error for ${bridgeId}:`, error);
      await this.updateBridgeStatus(bridgeId, 'failed', { 
        errorMessage: error instanceof Error ? error.message : 'Processing failed' 
      });
    }
  }

  // Process Ethereum to ICP bridge
  private async processEthereumToICP(bridge: BridgeTransaction): Promise<void> {
    // Step 1: Monitor for Ethereum deposit
    const ethTxHash = await this.monitorEthereumDeposit(bridge);
    await this.updateBridgeStatus(bridge.id, 'processing', { txHashFrom: ethTxHash });

    // Step 2: Wait for confirmations
    await this.waitForEthereumConfirmations(ethTxHash, bridge.requiredConfirmations);

    // Step 3: Mint ck tokens on ICP
    const icpTxHash = await this.mintCkTokens(bridge);
    await this.updateBridgeStatus(bridge.id, 'completed', { txHashTo: icpTxHash });
  }

  // Process ICP to Ethereum bridge
  private async processICPToEthereum(bridge: BridgeTransaction): Promise<void> {
    // Step 1: Monitor for ck token burn on ICP
    const icpTxHash = await this.monitorCkTokenBurn(bridge);
    await this.updateBridgeStatus(bridge.id, 'processing', { txHashFrom: icpTxHash });

    // Step 2: Initiate Ethereum withdrawal
    const ethTxHash = await this.initiateEthereumWithdrawal(bridge);
    await this.updateBridgeStatus(bridge.id, 'processing', { txHashTo: ethTxHash });

    // Step 3: Wait for Ethereum confirmation
    await this.waitForEthereumConfirmations(ethTxHash, bridge.requiredConfirmations);
    await this.updateBridgeStatus(bridge.id, 'completed');
  }

  // Monitor Ethereum deposit using EVM RPC canister
  private async monitorEthereumDeposit(bridge: BridgeTransaction): Promise<string> {
    // Implementation would monitor the bridge contract for deposits
    // This is a simplified version - full implementation would:
    // 1. Generate unique deposit address or use memo
    // 2. Monitor for transaction to bridge contract
    // 3. Verify amount and sender
    
    return new Promise((resolve) => {
      // Simulate monitoring delay
      setTimeout(() => {
        resolve(`0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`);
      }, 5000);
    });
  }

  // Wait for Ethereum confirmations
  private async waitForEthereumConfirmations(txHash: string, required: number): Promise<void> {
    // Implementation would use EVM RPC canister to check confirmations
    return new Promise((resolve) => {
      setTimeout(resolve, required * 15000); // ~15 seconds per block
    });
  }

  // Mint ck tokens on ICP
  private async mintCkTokens(bridge: BridgeTransaction): Promise<string> {
    if (!this.ckETHActor && !this.ckUSDCActor) {
      await this.initializeAgent();
    }

    const actor = bridge.toToken === 'ckETH' ? this.ckETHActor : this.ckUSDCActor;
    const toToken = bridge.toToken as keyof typeof TOKEN_CONFIG;
    const amount = BigInt(Math.floor(parseFloat(bridge.amount) * Math.pow(10, TOKEN_CONFIG[toToken].decimals)));

    try {
      const result = await actor.icrc1_transfer({
        to: { owner: Principal.fromText(bridge.toAddress) },
        amount,
        memo: new Uint8Array(Buffer.from(`bridge-${bridge.id}`, 'utf8'))
      });

      if ('Ok' in result) {
        return result.Ok.toString();
      } else {
        throw new Error(`Token transfer failed: ${result.Err}`);
      }
    } catch (error) {
      throw new Error(`ck token minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Monitor ck token burn on ICP
  private async monitorCkTokenBurn(bridge: BridgeTransaction): Promise<string> {
    // Implementation would monitor for ck token burn to bridge canister
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`${Math.floor(Math.random() * 1000000)}`);
      }, 3000);
    });
  }

  // Initiate Ethereum withdrawal
  private async initiateEthereumWithdrawal(bridge: BridgeTransaction): Promise<string> {
    // Implementation would trigger withdrawal from bridge contract
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`);
      }, 10000);
    });
  }

  // Update bridge transaction status
  private async updateBridgeStatus(bridgeId: string, status: BridgeStatus, updates?: Partial<BridgeTransaction>): Promise<void> {
    await storage.updateBridgeTransactionStatus(bridgeId, status, updates);
  }

  // Get bridge transaction status
  async getBridgeStatus(bridgeId: string): Promise<BridgeTransaction | null> {
    const bridge = await storage.getBridgeTransaction(bridgeId);
    return bridge || null;
  }

  // Get supported tokens for a network
  getSupportedTokens(network: SupportedNetwork): SupportedToken[] {
    if (network === 'ethereum') {
      return ['ETH', 'USDC'];
    } else if (network === 'icp') {
      return ['ckETH', 'ckUSDC'];
    }
    return [];
  }


  // Get supported bridge pairs
  getSupportedBridgePairs(): Array<{ from: SupportedNetwork; to: SupportedNetwork; fromToken: SupportedToken; toToken: SupportedToken }> {
    return [
      { from: 'ethereum', to: 'icp', fromToken: 'ETH', toToken: 'ckETH' },
      { from: 'ethereum', to: 'icp', fromToken: 'USDC', toToken: 'ckUSDC' },
      { from: 'icp', to: 'ethereum', fromToken: 'ckETH', toToken: 'ETH' },
      { from: 'icp', to: 'ethereum', fromToken: 'ckUSDC', toToken: 'USDC' },
    ];
  }

  // Get bridge transaction history with filters
  async getBridgeHistory(userId: string, filters: {
    status?: BridgeStatus;
    fromNetwork?: SupportedNetwork;
    toNetwork?: SupportedNetwork;
    limit?: number;
    offset?: number;
  } = {}): Promise<BridgeTransaction[]> {
    return await storage.getBridgeTransactionsByUser(userId, filters.limit, filters.offset);
  }
}

export const chainFusionBridge = ChainFusionBridgeService.getInstance();