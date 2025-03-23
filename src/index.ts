import { Hono } from 'hono';
import { z } from 'zod';
import { fetchPonderData } from './utils/ponder-service';
import { isAddress } from 'viem';
import { getERC20Balances } from './utils/erc20-balance';
import { cache } from './middleware/cache';

const app = new Hono();

// Apply cache middleware to all routes
app.use('*', cache());

app.get('/', (c) => c.text('Hono!'));

const MarketQuerySchema = z.object({
  marketIndex: z.string().optional(),
  forceFetch: z.coerce.boolean().optional(),
});
app.get('/markets', async (c) => {
  const rawQuery = c.req.query();
  const query = MarketQuerySchema.parse(rawQuery);

  try {
    const data = query.marketIndex
      ? await fetchPonderData(`/markets?marketIndex=${query.marketIndex}`, { forceFetch: query.forceFetch })
      : await fetchPonderData('/markets', { forceFetch: query.forceFetch });

    return c.json(data);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch market data',
      },
      500
    );
  }
});
const ConditionQuerySchema = z.object({
  walletAddress: z
    .string()
    .optional()
    .refine((address) => (address ? isAddress(address) : true), { message: 'Invalid wallet address' }),
});
app.get('/conditions', async (c) => {
  const rawQuery = c.req.query();
  const query = ConditionQuerySchema.parse(rawQuery);

  try {
    const data = await fetchPonderData('/conditions');

    if (query.walletAddress) {
      const balances = await getERC20Balances(
        query.walletAddress as `0x${string}`,
        data.map((condition: any) => condition.address as `0x${string}`)
      );

      const withBalances = data.map((condition: any, index: number) => ({
        ...condition,
        balance: balances[index].balance,
      }));

      return c.json(withBalances);
    } else {
      return c.json(data);
    }
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch conditions',
      },
      500
    );
  }
});

app.get('*', async (c) => {
  const data = await fetchPonderData(c.req.path);
  return c.json(data);
});

export default app;
