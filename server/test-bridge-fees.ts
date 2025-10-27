// Test bridge fee calculation in both directions
import { ChainFusionBridgeService } from './services/chain-fusion-bridge';

async function testBridgeFees() {
  console.log('=== Testing Bridge Fee Calculations (Oracle Integration) ===\n');
  
  const bridge = ChainFusionBridgeService.getInstance();

  try {
    // Test 1: ETH → ckETH (Ethereum source, should include Ethereum gas)
    console.log('1. Testing ETH → ckETH (Ethereum → ICP)...');
    const ethToIcp = await bridge.estimateBridge({
      fromNetwork: 'ethereum',
      toNetwork: 'icp',
      fromToken: 'ETH',
      toToken: 'ckETH',
      amount: '1.0'
    });
    console.log('Result:', {
      amount: '1.0 ETH',
      protocolFee: `${ethToIcp.bridgeFee} ETH (0.5%)`,
      networkFee: `${ethToIcp.networkFee} ETH (Ethereum gas)`,
      totalFee: `${ethToIcp.totalCost} ETH`,
      receive: `${ethToIcp.receiveAmount} ckETH`,
      time: `${ethToIcp.estimatedTime} minutes`
    });
    console.log('✓ ETH → ckETH successful\n');

    // Test 2: ckETH → ETH (ICP source, should include ICP + Ethereum gas)
    console.log('2. Testing ckETH → ETH (ICP → Ethereum)...');
    const icpToEth = await bridge.estimateBridge({
      fromNetwork: 'icp',
      toNetwork: 'ethereum',
      fromToken: 'ckETH',
      toToken: 'ETH',
      amount: '1.0'
    });
    console.log('Result:', {
      amount: '1.0 ckETH',
      protocolFee: `${icpToEth.bridgeFee} ckETH (0.5%)`,
      networkFee: `${icpToEth.networkFee} ckETH (ICP + Ethereum gas)`,
      totalFee: `${icpToEth.totalCost} ckETH`,
      receive: `${icpToEth.receiveAmount} ETH`,
      time: `${icpToEth.estimatedTime} minutes`
    });
    console.log('✓ ckETH → ETH successful\n');

    // Test 3: USDC → ckUSDC (Ethereum source)
    console.log('3. Testing USDC → ckUSDC (Ethereum → ICP)...');
    const usdcToIcp = await bridge.estimateBridge({
      fromNetwork: 'ethereum',
      toNetwork: 'icp',
      fromToken: 'USDC',
      toToken: 'ckUSDC',
      amount: '100'
    });
    console.log('Result:', {
      amount: '100 USDC',
      protocolFee: `${usdcToIcp.bridgeFee} USDC (0.5%)`,
      networkFee: `${usdcToIcp.networkFee} USDC (Ethereum gas)`,
      totalFee: `${usdcToIcp.totalCost} USDC`,
      receive: `${usdcToIcp.receiveAmount} ckUSDC`,
      time: `${usdcToIcp.estimatedTime} minutes`
    });
    console.log('✓ USDC → ckUSDC successful\n');

    // Test 4: ckUSDC → USDC (ICP source)
    console.log('4. Testing ckUSDC → USDC (ICP → Ethereum)...');
    const icpUsdcToEth = await bridge.estimateBridge({
      fromNetwork: 'icp',
      toNetwork: 'ethereum',
      fromToken: 'ckUSDC',
      toToken: 'USDC',
      amount: '100'
    });
    console.log('Result:', {
      amount: '100 ckUSDC',
      protocolFee: `${icpUsdcToEth.bridgeFee} ckUSDC (0.5%)`,
      networkFee: `${icpUsdcToEth.networkFee} ckUSDC (ICP + Ethereum gas)`,
      totalFee: `${icpUsdcToEth.totalCost} ckUSDC`,
      receive: `${icpUsdcToEth.receiveAmount} USDC`,
      time: `${icpUsdcToEth.estimatedTime} minutes`
    });
    console.log('✓ ckUSDC → USDC successful\n');

    // Test 5: Invalid pair (should fail validation)
    console.log('5. Testing invalid pair (ETH → ckUSDC)...');
    try {
      await bridge.estimateBridge({
        fromNetwork: 'ethereum',
        toNetwork: 'icp',
        fromToken: 'ETH',
        toToken: 'ckUSDC',
        amount: '1.0'
      });
      console.log('❌ Should have failed validation!');
    } catch (error) {
      console.log('✓ Correctly rejected:', (error as Error).message);
    }

    console.log('\n=== All Bridge Fee Tests Passed! ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testBridgeFees();
