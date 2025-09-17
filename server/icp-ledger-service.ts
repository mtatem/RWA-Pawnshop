// Server-side ICP Ledger integration for payment verification
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
  query_blocks: (args: {
    start: bigint;
    length: bigint;
  }) => Promise<{
    blocks: Array<{
      transaction: {
        memo: bigint;
        operation: {
          Transfer?: {
            to: Uint8Array;
            fee: { e8s: bigint };
            from: Uint8Array;
            amount: { e8s: bigint };
          };
        } | null;
      };
      timestamp: { timestamp_nanos: bigint };
      parent_hash?: [Uint8Array] | [];
    }>;
    chain_length: bigint;
    first_block_index: bigint;
    archived_blocks: Array<any>;
  }>;
}

// Transaction verification result
export interface TransactionVerification {
  found: boolean;
  verified: boolean;
  blockHeight?: bigint;
  timestamp?: Date;
  actualAmount?: bigint;
  actualMemo?: bigint;
  actualRecipient?: string;
  error?: string;
}

// ICP Ledger Canister ID (mainnet)
const ICP_LEDGER_CANISTER_ID = "rrkah-fqaaa-aaaaa-aaaaq-cai";

export class ICPLedgerService {
  private static instance: ICPLedgerService;
  private agent: HttpAgent | null = null;
  private ledgerActor: any = null;

  static getInstance(): ICPLedgerService {
    if (!ICPLedgerService.instance) {
      ICPLedgerService.instance = new ICPLedgerService();
    }
    return ICPLedgerService.instance;
  }

  // Initialize agent and ledger actor for server-side use
  private async initAgent(): Promise<void> {
    if (this.agent && this.ledgerActor) {
      return; // Already initialized
    }

    this.agent = new HttpAgent({
      host: process.env.NODE_ENV === 'production' 
        ? 'https://ic0.app' 
        : 'https://ic0.app',
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
        
        const Operation = IDL.Variant({
          Transfer: IDL.Record({
            to: AccountIdentifier,
            fee: Tokens,
            from: AccountIdentifier,
            amount: Tokens,
          }),
          Mint: IDL.Record({
            to: AccountIdentifier,
            amount: Tokens,
          }),
          Burn: IDL.Record({
            from: AccountIdentifier,
            amount: Tokens,
          }),
        });

        const Transaction = IDL.Record({
          memo: Memo,
          operation: IDL.Opt(Operation),
          created_at_time: IDL.Opt(TimeStamp),
        });

        const Block = IDL.Record({
          parent_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
          transaction: Transaction,
          timestamp: TimeStamp,
        });

        const BlockRange = IDL.Record({
          blocks: IDL.Vec(Block),
        });

        const ArchivedBlocksRange = IDL.Record({
          callback: IDL.Func([BlockRange], [BlockRange], ["query"]),
          start: IDL.Nat64,
          length: IDL.Nat64,
        });

        const QueryBlocksResponse = IDL.Record({
          certificate: IDL.Opt(IDL.Vec(IDL.Nat8)),
          blocks: IDL.Vec(Block),
          chain_length: IDL.Nat64,
          first_block_index: IDL.Nat64,
          archived_blocks: IDL.Vec(ArchivedBlocksRange),
        });
        
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
          query_blocks: IDL.Func(
            [IDL.Record({ start: IDL.Nat64, length: IDL.Nat64 })],
            [QueryBlocksResponse],
            ['query']
          ),
        });
      },
      {
        agent: this.agent,
        canisterId: ICP_LEDGER_CANISTER_ID,
      }
    );
  }

  // Convert principal to account identifier
  private principalToAccountId(principal: Principal): Uint8Array {
    return AccountIdentifier.fromPrincipal({
      principal,
      subAccount: undefined,
    }).toUint8Array();
  }

  // Get account balance for a principal
  async getBalance(principalId: string): Promise<number> {
    try {
      await this.initAgent();
      
      const principal = Principal.fromText(principalId);
      const accountId = this.principalToAccountId(principal);

      const result = await this.ledgerActor.account_balance({
        account: accountId,
      });

      return Number(result.e8s) / 100000000; // Convert e8s to ICP
    } catch (error) {
      console.error('Error getting balance from ICP Ledger:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get balance');
    }
  }

  // Verify a specific payment transaction
  async verifyPayment(
    expectedRecipient: string,
    expectedAmount: number,
    expectedMemo: string,
    fromBlockHeight?: number,
    timeoutMinutes: number = 10
  ): Promise<TransactionVerification> {
    try {
      await this.initAgent();

      const recipientPrincipal = Principal.fromText(expectedRecipient);
      const recipientAccountId = this.principalToAccountId(recipientPrincipal);
      const expectedAmountE8s = BigInt(Math.floor(expectedAmount * 100000000));
      const expectedMemoNum = BigInt(expectedMemo);

      // Get current chain length to determine search range
      const queryResult = await this.ledgerActor.query_blocks({
        start: BigInt(0),
        length: BigInt(1),
      });

      const chainLength = Number(queryResult.chain_length);
      const searchStartBlock = Math.max(fromBlockHeight || (chainLength - 1000), 0);
      
      console.log(`Searching for transaction from block ${searchStartBlock} to ${chainLength}`);
      console.log(`Expected: recipient=${expectedRecipient}, amount=${expectedAmount} ICP (${expectedAmountE8s} e8s), memo=${expectedMemo}`);

      // Search recent blocks for the transaction
      const searchLength = Math.min(1000, chainLength - searchStartBlock);
      if (searchLength <= 0) {
        return {
          found: false,
          verified: false,
          error: 'No blocks to search'
        };
      }

      const blocks = await this.ledgerActor.query_blocks({
        start: BigInt(searchStartBlock),
        length: BigInt(searchLength),
      });

      // Search through blocks for matching transaction
      for (let i = 0; i < blocks.blocks.length; i++) {
        const block = blocks.blocks[i];
        const blockIndex = searchStartBlock + i;
        
        if (block.transaction?.operation && 'Transfer' in block.transaction.operation) {
          const transfer = block.transaction.operation.Transfer;
          const memo = block.transaction.memo;
          const timestamp = new Date(Number(block.timestamp.timestamp_nanos) / 1000000);

          // Check if this transfer matches our expected payment
          const recipientMatches = this.arrayEquals(transfer.to, recipientAccountId);
          const amountMatches = transfer.amount.e8s === expectedAmountE8s;
          const memoMatches = memo === expectedMemoNum;

          console.log(`Block ${blockIndex}: recipient_match=${recipientMatches}, amount_match=${amountMatches} (${transfer.amount.e8s}e8s), memo_match=${memoMatches} (${memo})`);

          if (recipientMatches && amountMatches && memoMatches) {
            return {
              found: true,
              verified: true,
              blockHeight: BigInt(blockIndex),
              timestamp,
              actualAmount: transfer.amount.e8s,
              actualMemo: memo,
              actualRecipient: expectedRecipient,
            };
          }
        }
      }

      return {
        found: false,
        verified: false,
        error: `Transaction not found in blocks ${searchStartBlock}-${searchStartBlock + searchLength}`
      };
    } catch (error) {
      console.error('Error verifying payment on ICP Ledger:', error);
      return {
        found: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }

  // Helper to compare Uint8Arrays
  private arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Poll for payment confirmation with timeout
  async pollForPayment(
    expectedRecipient: string,
    expectedAmount: number,
    expectedMemo: string,
    timeoutMinutes: number = 10
  ): Promise<TransactionVerification> {
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let lastBlockHeight: number = 0;

    console.log(`Polling for payment: ${expectedAmount} ICP to ${expectedRecipient} with memo ${expectedMemo}`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const result = await this.verifyPayment(
          expectedRecipient,
          expectedAmount,
          expectedMemo,
          lastBlockHeight
        );

        if (result.verified) {
          console.log(`Payment verified at block ${result.blockHeight}`);
          return result;
        }

        // Update search position to avoid re-scanning same blocks
        if (result.error?.includes('blocks')) {
          const match = result.error.match(/blocks (\d+)-(\d+)/);
          if (match) {
            lastBlockHeight = parseInt(match[2]);
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('Error during payment polling:', error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
      }
    }

    return {
      found: false,
      verified: false,
      error: `Payment not found within ${timeoutMinutes} minutes timeout`
    };
  }

  // Get recent transactions for debugging
  async getRecentTransactions(count: number = 10): Promise<any[]> {
    try {
      await this.initAgent();

      const queryResult = await this.ledgerActor.query_blocks({
        start: BigInt(0),
        length: BigInt(1),
      });

      const chainLength = Number(queryResult.chain_length);
      const startBlock = Math.max(0, chainLength - count);

      const blocks = await this.ledgerActor.query_blocks({
        start: BigInt(startBlock),
        length: BigInt(count),
      });

      return blocks.blocks.map((block: any, index: number) => ({
        blockHeight: startBlock + index,
        timestamp: new Date(Number(block.timestamp.timestamp_nanos) / 1000000),
        memo: block.transaction.memo?.toString(),
        operation: block.transaction.operation,
      }));
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  }
}