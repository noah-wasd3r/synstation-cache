import { z } from 'zod';

export const TokenQuerySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.coerce.number().optional(),
  includePrice: z.coerce.boolean().optional().default(false),
});

export type TokenQueryType = z.infer<typeof TokenQuerySchema>;
