import { elizaLogger } from "@elizaos/core";
import type { Database } from "../types";
import { database } from '../database';

export async function markMentionAsProcessed(mentionId: string): Promise<boolean> {
    try {
        // First check if the mention is already processed
        const mention = await database.mentions.isProcessed(mentionId);
        if (mention) {
            elizaLogger.info(`Mention ${mentionId} was already processed.`);
            return true;
        }

        // If not processed, mark it as processed
        await database.mentions.update(
            { id: mentionId },
            { $set: { processed: true, processedAt: new Date() } }
        );

        elizaLogger.info(`Marked mention ${mentionId} as processed.`);
        return false;
    } catch (error) {
        elizaLogger.error(`Failed to mark mention ${mentionId} as processed:`, error);
        throw error;
    }
}
