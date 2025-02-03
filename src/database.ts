/// <reference types="node" />
import { Database } from './types';
import { elizaLogger } from "@elizaos/core";

declare const global: {
    setInterval(callback: () => void, ms: number): number;
    clearInterval(id: number): void;
    setTimeout(callback: () => void, ms: number): number;
    clearTimeout(id: number): void;
};

class DatabaseError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export class DatabaseImpl implements Database {
    private processedMentions = new Map<string, { processed: boolean; processedAt: Date }>();
    private maxCacheSize = 1000;
    private cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    private lastCleanup = Date.now();
    private cleanupTimer: number;

    constructor() {
        // Schedule periodic cleanup
        this.cleanupTimer = global.setInterval(() => {
            void this.cleanOldEntries();
        }, this.cleanupInterval);
    }

    private async evictOldestEntries(count: number = 1): Promise<void> {
        try {
            const entries = Array.from(this.processedMentions.entries())
                .sort(([, a], [, b]) => a.processedAt.getTime() - b.processedAt.getTime());

            for (let i = 0; i < Math.min(count, entries.length); i++) {
                this.processedMentions.delete(entries[i][0]);
            }

            elizaLogger.debug('Evicted oldest mentions from cache:', {
                count,
                remainingSize: this.processedMentions.size
            });
        } catch (error) {
            throw new DatabaseError('Failed to evict old entries', error);
        }
    }

    mentions = {
        update: async (
            query: { id: string },
            update: { $set: { processed: boolean; processedAt: Date } }
        ): Promise<void> => {
            try {
                if (!query.id) {
                    throw new DatabaseError('Invalid mention ID');
                }

                // Implement cache eviction if size exceeds limit
                if (this.processedMentions.size >= this.maxCacheSize) {
                    await this.evictOldestEntries(Math.ceil(this.maxCacheSize * 0.1)); // Remove 10% of oldest entries
                }

                this.processedMentions.set(query.id, update.$set);
                elizaLogger.debug('Updated mention status:', {
                    id: query.id,
                    status: update.$set,
                    cacheSize: this.processedMentions.size
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                elizaLogger.error('Failed to update mention status:', {
                    id: query.id,
                    error: message
                });
                throw new DatabaseError(`Failed to update mention status: ${message}`, error);
            }
        },

        isProcessed: async (mentionId: string): Promise<boolean> => {
            try {
                if (!mentionId) {
                    throw new DatabaseError('Invalid mention ID');
                }

                const entry = this.processedMentions.get(mentionId);
                if (!entry) {
                    return false;
                }

                // Clean up old entries (older than 7 days)
                const now = new Date();
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (entry.processedAt < sevenDaysAgo) {
                    this.processedMentions.delete(mentionId);
                    elizaLogger.debug('Cleaned up old mention:', { id: mentionId });
                    return false;
                }

                return entry.processed;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                elizaLogger.error('Failed to check mention status:', {
                    id: mentionId,
                    error: message
                });
                throw new DatabaseError(`Failed to check mention status: ${message}`, error);
            }
        }
    };

    async cleanOldEntries(): Promise<void> {
        try {
            const now = Date.now();
            // Only run cleanup if enough time has passed since last cleanup
            if (now - this.lastCleanup < this.cleanupInterval) {
                return;
            }

            const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            let cleanedCount = 0;

            for (const [id, entry] of this.processedMentions.entries()) {
                if (entry.processedAt < sevenDaysAgo) {
                    this.processedMentions.delete(id);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                elizaLogger.info('Cleaned old mentions:', {
                    cleanedCount,
                    remainingSize: this.processedMentions.size
                });
            }

            this.lastCleanup = now;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            elizaLogger.error('Failed to clean old entries:', { error: message });
            throw new DatabaseError(`Failed to clean old entries: ${message}`, error);
        }
    }
}

export const database = new DatabaseImpl();