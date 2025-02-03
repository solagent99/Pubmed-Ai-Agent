import { z } from 'zod';
import debug from 'debug';

const debugLog = debug('eliza:pubmed:schema');

// Shared refinements
const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .refine(
    (date: string) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    },
    'Invalid date value'
  );

// Configuration schema for PubMed API settings
export const PubmedConfigSchema = z.object({
  apiKey: z.string()
    .trim()
    .min(1, 'API key is required')
    .regex(/^[A-Za-z0-9_-]+$/, 'API key must only contain letters, numbers, underscores, and hyphens'),
  maxResults: z.number()
    .int('Must be an integer')
    .positive('Must be positive')
    .max(100, 'Maximum 100 results allowed')
    .default(10),
  cacheDuration: z.number()
    .int('Must be an integer')
    .nonnegative('Must be non-negative')
    .default(3600)
    .describe('Cache duration in seconds'),
  rateLimits: z.object({
    requestsPerSecond: z.number()
      .int('Must be an integer')
      .positive('Must be positive')
      .max(10, 'Maximum 10 requests per second allowed')
      .default(3),
    maxRetries: z.number()
      .int('Must be an integer')
      .positive('Must be positive')
      .max(5, 'Maximum 5 retries allowed')
      .default(3)
  }).optional()
});

// Search parameters schema for PubMed queries
export const PubmedSearchParamsSchema = z.object({
  query: z.string()
    .trim()
    .min(1, 'Search query is required')
    .max(500, 'Query too long - maximum 500 characters')
    .transform((q: string) => q.replace(/\s+/g, ' ')), // Normalize whitespace
  maxResults: z.number()
    .int('Must be an integer')
    .positive('Must be positive')
    .max(100, 'Maximum 100 results allowed')
    .default(10)
    .optional(),
  sortBy: z.createEnum(['relevance', 'date'] as const)
    .default('relevance'),
  fromDate: dateStringSchema
    .optional()
    .refine(
      (date: string | undefined) => !date || new Date(date) >= new Date('1900-01-01'),
      'From date must be after 1900'
    ),
  toDate: dateStringSchema
    .optional()
    .refine(
      (date: string | undefined) => !date || new Date(date) <= new Date(),
      'To date cannot be in the future'
    )
}).refine(
  (data: { fromDate?: string; toDate?: string }) =>
    !data.fromDate || !data.toDate || new Date(data.fromDate) <= new Date(data.toDate),
  'From date must be before or equal to to date'
);

// Article schema for PubMed results
export const PubmedArticleSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Title is required')
    .max(1000, 'Title too long - maximum 1000 characters')
    .transform((t: string) => t.replace(/\s+/g, ' ')), // Normalize whitespace
  abstract: z.string()
    .trim()
    .max(5000, 'Abstract too long - maximum 5000 characters')
    .transform((a: string) => a.replace(/\s+/g, ' ')) // Normalize whitespace
    .optional(),
  url: z.string()
    .url('Invalid URL format')
    .startsWith('https://', 'URL must use HTTPS')
    .max(2000, 'URL too long - maximum 2000 characters'),
  pmid: z.string()
    .trim()
    .min(1, 'PMID is required')
    .regex(/^\d+$/, 'PMID must be a numeric string')
    .max(20, 'PMID too long - maximum 20 characters'),
  journal: z.string()
    .trim()
    .min(1, 'Journal name is required')
    .max(500, 'Journal name too long - maximum 500 characters'),
  year: z.string()
    .regex(/^\d{4}$/, 'Invalid year format - must be YYYY')
    .refine(
      (year: string) => {
        const yearNum = parseInt(year);
        return yearNum >= 1900 && yearNum <= new Date().getFullYear();
      },
      'Year must be between 1900 and current year'
    ),
  authors: z.array(
    z.string()
      .trim()
      .min(1, 'Author name cannot be empty')
      .max(100, 'Author name too long - maximum 100 characters')
      .regex(/^[^0-9]+$/, 'Author name cannot contain numbers')
  )
    .min(1, 'At least one author is required')
    .max(100, 'Too many authors - maximum 100 allowed')
});

// Export types
export type PubmedConfig = ReturnType<typeof PubmedConfigSchema.parse>;
export type PubmedSearchParams = ReturnType<typeof PubmedSearchParamsSchema.parse>;
export type PubmedArticle = ReturnType<typeof PubmedArticleSchema.parse>;

// Debug validation errors
export function validateWithDebug<T>(schema: ReturnType<typeof z.object>, data: unknown): T {
  try {
    return schema.parse(data) as T;
  } catch (err: unknown) {
    if (err instanceof Error && 'issues' in err) {
      debugLog('Validation failed: %O', {
        issues: (err as { issues: unknown[] }).issues,
        data
      });
    }
    throw err;
  }
}
