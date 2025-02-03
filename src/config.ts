// src/config.ts
import { z } from 'zod';
import { PubmedConfigSchema } from './schema';
import type { PubmedConfig } from './types';

// Extended configuration schema with additional settings
export const ExtendedConfigSchema = z.object({
  pubmed: z.object({
    ...PubmedConfigSchema.shape,
    searchInterval: z.number().int().positive().default(30), // minutes
    tweetTemplate: z.string().min(1, 'Tweet template is required'),
    searchTerms: z.array(z.string().trim().min(1)).min(1, 'At least one search term is required')
  })
});

export type ExtendedConfig = ReturnType<typeof ExtendedConfigSchema.parse>;

export function validateConfig(config: PubmedConfig): void {
  try {
    ExtendedConfigSchema.parse({ pubmed: config });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid configuration:\n${issues}`);
    }
    throw error;
  }
}
