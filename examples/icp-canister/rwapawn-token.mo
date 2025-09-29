// RWAPAWN Token Canister - ICRC-1 Implementation
// This would be deployed on ICP to create real blockchain tokens

import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Debug "mo:base/Debug";

actor RWAPAWNToken {
  
  // ICRC-1 Token Standard Implementation
  type Account = { owner : Principal; subaccount : ?[Nat8] };
  type Balance = Nat;
  type TransferResult = {#Ok: Nat; #Err: TransferError};
  
  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  // Token Configuration (matching your whitepaper)
  private stable let TOKEN_NAME = "RWAPAWN Token";
  private stable let TOKEN_SYMBOL = "RWAPAWN"; 
  private stable let TOKEN_DECIMALS = 8; // ICP standard
  private stable let TOTAL_SUPPLY = 10_000_000_000_00000000; // 10B tokens with 8 decimals
  private stable let TRANSFER_FEE = 10000; // 0.0001 RWAPAWN (standard ICP fee)
  
  // Platform addresses for token distribution
  private stable let PLATFORM_TREASURY = Principal.fromText("rdmx6-jaaaa-aaaah-qcaiq-cai"); // Replace with actual
  private stable let TEAM_VESTING = Principal.fromText("rrkah-fqaaa-aaaah-qcaiw-cai"); // Replace with actual
  private stable let LIQUIDITY_POOL = Principal.fromText("renrk-eyaaa-aaaah-qcaia-cai"); // Replace with actual
  
  // Token balances storage
  private stable var balances : [(Principal, Nat)] = [];
  private var balanceMap = HashMap.fromIter<Principal, Nat>(balances.vals(), 0, Principal.equal, Principal.hash);
  
  // Transaction history
  private stable var transactionId : Nat = 0;
  private stable var transactions : [(Nat, {from: Principal; to: Principal; amount: Nat; timestamp: Int})] = [];
  
  // Initialize token supply distribution
  system func preupgrade() {
    balances := balanceMap.entries() |> Array.fromIter(_);
  };
  
  system func postupgrade() {
    balances := [];
  };

  // ICRC-1 Standard Functions
  
  public query func icrc1_name() : async Text {
    TOKEN_NAME
  };
  
  public query func icrc1_symbol() : async Text {
    TOKEN_SYMBOL
  };
  
  public query func icrc1_decimals() : async Nat8 {
    TOKEN_DECIMALS
  };
  
  public query func icrc1_total_supply() : async Nat {
    TOTAL_SUPPLY
  };
  
  public query func icrc1_balance_of(account: Account) : async Balance {
    switch (balanceMap.get(account.owner)) {
      case (null) { 0 };
      case (?balance) { balance };
    }
  };
  
  public query func icrc1_fee() : async Nat {
    TRANSFER_FEE
  };
  
  // Main transfer function
  public func icrc1_transfer(args: {
    to: Account;
    amount: Nat;
    fee: ?Nat;
    memo: ?[Nat8];
    from_subaccount: ?[Nat8];
    created_at_time: ?Nat64;
  }) : async TransferResult {
    
    let caller = msg.caller;
    let from = caller;
    let to = args.to.owner;
    let amount = args.amount;
    let fee = switch (args.fee) { case (null) TRANSFER_FEE; case (?f) f };
    
    // Validate fee
    if (fee != TRANSFER_FEE) {
      return #Err(#BadFee({ expected_fee = TRANSFER_FEE }));
    };
    
    // Check sender balance
    let senderBalance = switch (balanceMap.get(from)) {
      case (null) 0;
      case (?balance) balance;
    };
    
    let totalRequired = amount + fee;
    if (senderBalance < totalRequired) {
      return #Err(#InsufficientFunds({ balance = senderBalance }));
    };
    
    // Execute transfer
    balanceMap.put(from, senderBalance - totalRequired);
    
    let receiverBalance = switch (balanceMap.get(to)) {
      case (null) 0;
      case (?balance) balance;
    };
    balanceMap.put(to, receiverBalance + amount);
    
    // Record transaction
    transactionId += 1;
    let transaction = {
      from = from;
      to = to;
      amount = amount;
      timestamp = Time.now();
    };
    transactions := Array.append(transactions, [(transactionId, transaction)]);
    
    #Ok(transactionId)
  };
  
  // Platform-specific functions for RWAPAWN ecosystem
  
  // Initial token distribution (called once after deployment)
  public func initialize_distribution() : async Bool {
    // Only callable by canister controller
    assert(msg.caller == Principal.fromText("rdmx6-jaaaa-aaaah-qcaiq-cai")); // Replace with deployer
    
    // Distribute according to whitepaper:
    // Development & Operations (25% - 2.5B tokens)
    balanceMap.put(PLATFORM_TREASURY, 2_500_000_000_00000000);
    
    // Liquidity Pool (30% - 3B tokens) 
    balanceMap.put(LIQUIDITY_POOL, 3_000_000_000_00000000);
    
    // Team & Advisors (20% - 2B tokens) - locked in vesting contract
    balanceMap.put(TEAM_VESTING, 2_000_000_000_00000000);
    
    // Community & Ecosystem (20% - 2B tokens) - kept in treasury for rewards
    // Public Sale (15% - 1.5B tokens) - kept in treasury for sales
    // Treasury Reserve (5% - 500M tokens)
    // Total: 2B + 1.5B + 500M = 4B tokens in platform treasury
    
    true
  };
  
  // Mint tokens for platform sales (only callable by platform)
  public func mint_for_purchase(recipient: Principal, amount: Nat) : async TransferResult {
    // Only platform treasury can mint for purchases
    assert(msg.caller == PLATFORM_TREASURY);
    
    let currentBalance = switch (balanceMap.get(recipient)) {
      case (null) 0;
      case (?balance) balance;
    };
    
    balanceMap.put(recipient, currentBalance + amount);
    
    transactionId += 1;
    let transaction = {
      from = PLATFORM_TREASURY;
      to = recipient;
      amount = amount;
      timestamp = Time.now();
    };
    transactions := Array.append(transactions, [(transactionId, transaction)]);
    
    #Ok(transactionId)
  };
  
  // Burn tokens for deflationary mechanism
  public func burn_tokens(amount: Nat) : async Bool {
    // Only platform treasury can burn
    assert(msg.caller == PLATFORM_TREASURY);
    
    let treasuryBalance = switch (balanceMap.get(PLATFORM_TREASURY)) {
      case (null) 0;
      case (?balance) balance;
    };
    
    if (treasuryBalance >= amount) {
      balanceMap.put(PLATFORM_TREASURY, treasuryBalance - amount);
      true
    } else {
      false
    }
  };
  
  // Query functions for platform integration
  public query func get_platform_balances() : async {
    treasury: Nat;
    liquidity: Nat; 
    team: Nat;
  } {
    {
      treasury = switch (balanceMap.get(PLATFORM_TREASURY)) { case (null) 0; case (?b) b };
      liquidity = switch (balanceMap.get(LIQUIDITY_POOL)) { case (null) 0; case (?b) b };
      team = switch (balanceMap.get(TEAM_VESTING)) { case (null) 0; case (?b) b };
    }
  };
  
  public query func get_transaction_history(limit: ?Nat) : async [(Nat, {from: Principal; to: Principal; amount: Nat; timestamp: Int})] {
    let maxResults = switch (limit) { case (null) 100; case (?l) l };
    let totalTxs = transactions.size();
    let startIndex = if (totalTxs > maxResults) totalTxs - maxResults else 0;
    
    Array.tabulate<(Nat, {from: Principal; to: Principal; amount: Nat; timestamp: Int})>(
      Int.min(maxResults, totalTxs), 
      func(i) = transactions[startIndex + i]
    )
  };
}