import { z, type ZodType, ZodError } from 'zod';
import debug from 'debug';

const debugLog = debug('eliza:pubmed:schema');

// Auth configuration schema
export type PubmedAuthConfig = {
    apiKey: string;
    clientId: string;
    clientSecret: string;
};

export const PubmedAuthConfigSchema = z.object({
    apiKey: z.string().trim().min(1, "API key is required"),
    clientId: z.string().trim().min(1, "Client ID is required"),
    clientSecret: z.string().trim().min(1, "Client secret is required")
});

// Mention tracking schema
export type PubmedMention = {
    id: string;
    text: string;
    processed: boolean;
    processedAt?: Date;
};

export const PubmedMentionSchema = z.object({
    id: z.string().trim().min(1, "Mention ID is required"),
    text: z.string().trim().min(1, "Mention text is required"),
    processed: z.boolean(),
    processedAt: z.string()
        .transform(str => new Date(str))
        .optional()
});

// Validate data with debug logging
export async function validateWithDebug<T>(schema: ZodType<T>, data: unknown): Promise<T> {
    try {
        const result = schema.parse(data);
        debugLog('Validation successful:', { data });
        return result;
    } catch (error) {
        if (error instanceof ZodError) {
            debugLog('Validation failed:', {
                data,
                errors: error.issues.map(issue => ({
                    path: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
        throw error;
    }
}