// Simple test script for oracle integration
import { priceOracleService } from './services/price-oracle';
import { parseToBigInt, formatBigIntToDecimal, calculatePercentage } from './utils/decimal-parser';

async function testOracleIntegration() {
  console.log('=== Testing Oracle Integration ===\n');

  try {
    // Test 1: Fetch token prices
    console.log('1. Fetching token prices from CoinGecko...');
    const prices = await priceOracleService.getTokenPrices();
    console.log('Prices:', {
      ETH: `$${prices.ETH}`,
      ICP: `$${prices.ICP}`,
      USDC: `$${prices.USDC}`,
      ckETH: `$${prices.ckETH}`,
      ckUSDC: `$${prices.ckUSDC}`,
    });
    console.log('✓ Price fetch successful\n');

    // Test 2: Estimate Ethereum gas cost
    console.log('2. Estimating Ethereum gas cost...');
    const gasEstimate = await priceOracleService.estimateEthereumGasCost();
    console.log('Gas estimate:', {
      gasUnits: gasEstimate.estimatedGasUnits,
      baseFee: `${gasEstimate.baseFeePerGas} gwei`,
      priorityFee: `${gasEstimate.maxPriorityFeePerGas} gwei`,
      totalCostETH: `${gasEstimate.totalGasCostETH.toFixed(6)} ETH`,
      totalCostUSD: `$${gasEstimate.totalGasCostUSD.toFixed(2)}`,
    });
    console.log('✓ Gas estimation successful\n');

    // Test 3: Estimate ICP network cost
    console.log('3. Estimating ICP network cost...');
    const icpCost = await priceOracleService.estimateICPNetworkCost();
    console.log('ICP cost:', {
      costICP: `${icpCost.costICP} ICP`,
      costUSD: `$${icpCost.costUSD.toFixed(4)}`,
    });
    console.log('✓ ICP cost estimation successful\n');

    // Test 4: Test decimal parsing
    console.log('4. Testing precise decimal parsing...');
    const testAmount = "1.5";
    const ethDecimals = 18;
    const amountBigInt = parseToBigInt(testAmount, ethDecimals);
    console.log(`Parse "${testAmount}" ETH:`, amountBigInt.toString(), 'wei');
    
    const formatted = formatBigIntToDecimal(amountBigInt, ethDecimals);
    console.log(`Format back:`, formatted, 'ETH');
    console.log('✓ Decimal parsing successful\n');

    // Test 5: Test percentage calculation
    console.log('5. Testing percentage calculation...');
    const testValue = parseToBigInt("100", 6); // 100 USDC
    const fee = calculatePercentage(testValue, 50); // 0.5%
    const feeFormatted = formatBigIntToDecimal(fee, 6);
    console.log(`0.5% of 100 USDC:`, feeFormatted, 'USDC');
    console.log('✓ Percentage calculation successful\n');

    // Test 6: Full bridge fee calculation simulation
    console.log('6. Simulating full bridge fee calculation (1 ETH → ckETH)...');
    const bridgeAmount = parseToBigInt("1.0", 18);
    const protocolFee = calculatePercentage(bridgeAmount, 50); // 0.5%
    const networkFeeETH = parseToBigInt(gasEstimate.totalGasCostETH.toString(), 18);
    const totalFee = protocolFee + networkFeeETH;
    const receiveAmount = bridgeAmount - totalFee;
    
    console.log('Bridge calculation:', {
      amount: '1.0 ETH',
      protocolFee: `${formatBigIntToDecimal(protocolFee, 18)} ETH (0.5%)`,
      networkFee: `${formatBigIntToDecimal(networkFeeETH, 18)} ETH ($${gasEstimate.totalGasCostUSD.toFixed(2)})`,
      totalFee: `${formatBigIntToDecimal(totalFee, 18)} ETH`,
      receive: `${formatBigIntToDecimal(receiveAmount, 18)} ckETH`,
    });
    console.log('✓ Bridge fee calculation successful\n');

    console.log('=== All Tests Passed! ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOracleIntegration();
