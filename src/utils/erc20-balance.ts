import { createPublicClient, erc20Abi, http } from 'viem';
import { soneium } from 'viem/chains';
const publicClient = createPublicClient({
  chain: soneium,
  transport: http(),
});

interface BalanceResult {
  token: `0x${string}`;
  balance: number;
  success: boolean;
  error?: string;
}

export async function getERC20Balances(walletAddress: `0x${string}`, tokenAddresses: `0x${string}`[]): Promise<BalanceResult[]> {
  try {
    const balanceCalls = tokenAddresses.map((token) => ({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress],
    }));

    const results = await publicClient.multicall({
      contracts: balanceCalls,
    });

    return results.map((result, index) => ({
      token: tokenAddresses[index],
      balance: result.status === 'success' ? Number(result.result) : 0,
      success: result.status === 'success',
      error: result.status === 'failure' ? result.error?.message : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch ERC20 balances:', error);
    throw error;
  }
}
