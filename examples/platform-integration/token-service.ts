// Integration service to connect your platform with real RWAPAWN tokens
// This replaces the mock ICP service with real blockchain calls

import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// IDL interface for your RWAPAWN canister (auto-generated from .did file)
export const idlFactory = ({ IDL }: any) => {
  const Account = IDL.Record({ 
    'owner': IDL.Principal, 
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)) 
  });
  
  const TransferArgs = IDL.Record({
    'to': Account,
    'amount': IDL.Nat,
    'fee': IDL.Opt(IDL.Nat),
    'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(IDL.Nat64),
  });
  
  const TransferError = IDL.Variant({
    'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
    'BadBurn': IDL.Record({ 'min_burn_amount': IDL.Nat }),
    'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
    'TooOld': IDL.Null,
    'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'TemporarilyUnavailable': IDL.Null,
    'GenericError': IDL.Record({ 'error_code': IDL.Nat, 'message': IDL.Text }),
  });
  
  const TransferResult = IDL.Variant({ 'Ok': IDL.Nat, 'Err': TransferError });
  
  return IDL.Service({
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'icrc1_fee': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func([TransferArgs], [TransferResult], []),
    'mint_for_purchase': IDL.Func([IDL.Principal, IDL.Nat], [TransferResult], []),
    'burn_tokens': IDL.Func([IDL.Nat], [IDL.Bool], []),
    'get_platform_balances': IDL.Func([], [IDL.Record({
      'treasury': IDL.Nat,
      'liquidity': IDL.Nat,
      'team': IDL.Nat,
    })], ['query']),
  });
};

export interface RWAPAWNCanister {
  icrc1_name(): Promise<string>;
  icrc1_symbol(): Promise<string>;
  icrc1_decimals(): Promise<number>;
  icrc1_total_supply(): Promise<bigint>;
  icrc1_balance_of(account: { owner: Principal; subaccount?: Uint8Array[] }): Promise<bigint>;
  icrc1_fee(): Promise<bigint>;
  icrc1_transfer(args: {
    to: { owner: Principal; subaccount?: Uint8Array[] };
    amount: bigint;
    fee?: bigint;
    memo?: Uint8Array;
    from_subaccount?: Uint8Array;
    created_at_time?: bigint;
  }): Promise<{ Ok: bigint } | { Err: any }>;
  mint_for_purchase(recipient: Principal, amount: bigint): Promise<{ Ok: bigint } | { Err: any }>;
  burn_tokens(amount: bigint): Promise<boolean>;
  get_platform_balances(): Promise<{
    treasury: bigint;
    liquidity: bigint; 
    team: bigint;
  }>;
}

class RealRWAPAWNTokenService {
  private canisterId: string;
  private agent: HttpAgent;
  private actor: RWAPAWNCanister;

  constructor(canisterId: string, isLocal = false) {
    this.canisterId = canisterId;
    
    // Create agent (local vs mainnet)
    this.agent = new HttpAgent({
      host: isLocal ? "http://127.0.0.1:4943" : "https://ic0.app"
    });
    
    // Only needed for local development
    if (isLocal) {
      this.agent.fetchRootKey();
    }
    
    // Create actor to interact with canister
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: this.canisterId,
    }) as RWAPAWNCanister;
  }

  // Replace your current database-based token purchase
  async purchaseTokens(userPrincipal: string, usdAmount: number): Promise<{
    success: boolean;
    tokenAmount?: number;
    transactionId?: number;
    error?: string;
  }> {
    try {
      const TOKENS_PER_USD = 4; // $0.25 per token
      const tokenAmount = usdAmount * TOKENS_PER_USD;
      const tokenAmountE8s = BigInt(tokenAmount * 100_000_000); // Convert to e8s (8 decimals)
      
      const recipient = Principal.fromText(userPrincipal);
      
      // Call canister to mint tokens for purchase
      const result = await this.actor.mint_for_purchase(recipient, tokenAmountE8s);
      
      if ('Ok' in result) {
        return {
          success: true,
          tokenAmount: tokenAmount,
          transactionId: Number(result.Ok)
        };
      } else {
        return {
          success: false,
          error: `Token minting failed: ${JSON.stringify(result.Err)}`
        };
      }
    } catch (error) {
      console.error('Token purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get real token balance from blockchain
  async getTokenBalance(userPrincipal: string): Promise<number> {
    try {
      const principal = Principal.fromText(userPrincipal);
      const balanceE8s = await this.actor.icrc1_balance_of({ owner: principal });
      
      // Convert from e8s to regular tokens (divide by 100M)
      return Number(balanceE8s) / 100_000_000;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  }

  // Transfer tokens between users
  async transferTokens(
    fromPrincipal: string,
    toPrincipal: string, 
    amount: number
  ): Promise<{ success: boolean; transactionId?: number; error?: string }> {
    try {
      const amountE8s = BigInt(amount * 100_000_000);
      const to = Principal.fromText(toPrincipal);
      
      const result = await this.actor.icrc1_transfer({
        to: { owner: to },
        amount: amountE8s
      });
      
      if ('Ok' in result) {
        return {
          success: true,
          transactionId: Number(result.Ok)
        };
      } else {
        return {
          success: false,
          error: `Transfer failed: ${JSON.stringify(result.Err)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer error'
      };
    }
  }

  // Get platform treasury info
  async getPlatformStats(): Promise<{
    treasuryBalance: number;
    liquidityBalance: number;
    teamBalance: number;
    totalSupply: number;
  }> {
    try {
      const [balances, totalSupply] = await Promise.all([
        this.actor.get_platform_balances(),
        this.actor.icrc1_total_supply()
      ]);
      
      return {
        treasuryBalance: Number(balances.treasury) / 100_000_000,
        liquidityBalance: Number(balances.liquidity) / 100_000_000,
        teamBalance: Number(balances.team) / 100_000_000,
        totalSupply: Number(totalSupply) / 100_000_000
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      return {
        treasuryBalance: 0,
        liquidityBalance: 0,
        teamBalance: 0,
        totalSupply: 10_000_000_000 // Fallback to known total
      };
    }
  }

  // Burn tokens for deflationary mechanism  
  async burnTokens(amount: number): Promise<boolean> {
    try {
      const amountE8s = BigInt(amount * 100_000_000);
      return await this.actor.burn_tokens(amountE8s);
    } catch (error) {
      console.error('Error burning tokens:', error);
      return false;
    }
  }
}

// Export service instance
export const rwapawnTokenService = new RealRWAPAWNTokenService(
  process.env.RWAPAWN_CANISTER_ID || "rdmx6-jaaaa-aaaah-qcaiq-cai", // Replace with actual
  process.env.NODE_ENV === 'development'
);

// Migration helper: Convert database balances to real tokens
export async function migrateUserToRealTokens(
  userId: string, 
  userPrincipal: string, 
  databaseBalance: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would be called during user migration
    const result = await rwapawnTokenService.purchaseTokens(userPrincipal, databaseBalance * 0.25);
    
    if (result.success) {
      // Update database to mark user as migrated
      // You'd add a `migrated_to_blockchain: boolean` column
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Migration failed' 
    };
  }
}