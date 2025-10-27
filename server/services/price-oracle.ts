// Price Oracle Service for fetching real-time token prices and gas costs
// Uses CoinGecko API for price feeds (free tier: 10-50 calls/min)
// Production should implement caching to stay within rate limits

export interface TokenPrices {
  ETH: number;
  ICP: number;
  USDC: number;
  ckETH: number;
  ckUSDC: number;
}

export interface GasEstimate {
  estimatedGasUnits: number;
  baseFeePerGas: number; // in gwei
  maxPriorityFeePerGas: number; // in gwei
  totalGasCostGwei: number;
  totalGasCostETH: number;
  totalGasCostUSD: number;
}

class PriceOracleService {
  private priceCache: TokenPrices | null = null;
  private priceCacheTimestamp: number = 0;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // Fetch current token prices from CoinGecko
  async getTokenPrices(): Promise<TokenPrices> {
    const now = Date.now();
    
    // Return cached prices if still valid
    if (this.priceCache && (now - this.priceCacheTimestamp) < this.CACHE_DURATION_MS) {
      return this.priceCache;
    }

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,internet-computer,usd-coin&vs_currencies=usd',
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        ethereum?: { usd: number };
        'internet-computer'?: { usd: number };
        'usd-coin'?: { usd: number };
      };

      const prices: TokenPrices = {
        ETH: data.ethereum?.usd || 0,
        ICP: data['internet-computer']?.usd || 0,
        USDC: data['usd-coin']?.usd || 1.0, // Stablecoin should be ~$1
        ckETH: data.ethereum?.usd || 0, // ckETH is 1:1 with ETH
        ckUSDC: data['usd-coin']?.usd || 1.0, // ckUSDC is 1:1 with USDC
      };

      // Cache the prices
      this.priceCache = prices;
      this.priceCacheTimestamp = now;

      return prices;
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      
      // Return cached prices if available, otherwise fallback values
      if (this.priceCache) {
        console.warn('Using cached prices due to API error');
        return this.priceCache;
      }

      // Fallback prices (update these periodically or use stored values)
      console.warn('Using fallback prices due to API error and no cache');
      return {
        ETH: 3000,
        ICP: 3.28,
        USDC: 1.0,
        ckETH: 3000,
        ckUSDC: 1.0,
      };
    }
  }

  // Estimate Ethereum gas cost for bridge transaction
  async estimateEthereumGasCost(): Promise<GasEstimate> {
    try {
      // Use Etherscan Gas Tracker API (free, no API key required for basic usage)
      const response = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
      
      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        status: string;
        result?: {
          SafeGasPrice: string;
          ProposeGasPrice: string;
          FastGasPrice: string;
          suggestBaseFee?: string;
        };
      };

      if (data.status !== '1' || !data.result) {
        throw new Error('Invalid Etherscan API response');
      }

      // Typical bridge transaction uses ~100,000 gas units for ERC20 transfers
      const estimatedGasUnits = 100000;
      
      // Use proposed gas price (middle tier)
      const baseFeePerGas = parseFloat(data.result.ProposeGasPrice);
      const maxPriorityFeePerGas = 2; // 2 gwei is typical priority fee
      
      const totalGasCostGwei = estimatedGasUnits * (baseFeePerGas + maxPriorityFeePerGas);
      const totalGasCostETH = totalGasCostGwei / 1e9; // Convert gwei to ETH

      // Get ETH price for USD conversion
      const prices = await this.getTokenPrices();
      const totalGasCostUSD = totalGasCostETH * prices.ETH;

      return {
        estimatedGasUnits,
        baseFeePerGas,
        maxPriorityFeePerGas,
        totalGasCostGwei,
        totalGasCostETH,
        totalGasCostUSD,
      };
    } catch (error) {
      console.error('Failed to estimate Ethereum gas cost:', error);
      
      // Fallback: Conservative estimate of ~$15 at typical gas prices
      const fallbackGasCostUSD = 15;
      const prices = await this.getTokenPrices();
      const fallbackGasCostETH = fallbackGasCostUSD / prices.ETH;

      return {
        estimatedGasUnits: 100000,
        baseFeePerGas: 8,
        maxPriorityFeePerGas: 2,
        totalGasCostGwei: 1000000, // 0.001 ETH in gwei
        totalGasCostETH: fallbackGasCostETH,
        totalGasCostUSD: fallbackGasCostUSD,
      };
    }
  }

  // Estimate ICP network cost (minimal, typically <$0.01)
  async estimateICPNetworkCost(): Promise<{ costICP: number; costUSD: number }> {
    const prices = await this.getTokenPrices();
    const costICP = 0.0001; // Typical ICP transaction cost in ICP
    const costUSD = costICP * prices.ICP;

    return {
      costICP,
      costUSD,
    };
  }

  // Convert amount from one token to another using current prices
  async convertTokenAmount(
    amount: number,
    fromToken: 'ETH' | 'ICP' | 'USDC' | 'ckETH' | 'ckUSDC',
    toToken: 'ETH' | 'ICP' | 'USDC' | 'ckETH' | 'ckUSDC'
  ): Promise<number> {
    const prices = await this.getTokenPrices();
    
    const fromPriceUSD = prices[fromToken];
    const toPriceUSD = prices[toToken];
    
    if (fromPriceUSD === 0 || toPriceUSD === 0) {
      throw new Error(`Cannot convert: Invalid price for ${fromToken} or ${toToken}`);
    }
    
    const amountUSD = amount * fromPriceUSD;
    const convertedAmount = amountUSD / toPriceUSD;
    
    return convertedAmount;
  }
}

export const priceOracleService = new PriceOracleService();
