import { IAgentRuntime, Memory, elizaLogger, State } from "@elizaos/core";
import { searchPubMed } from "./utils/pubmed";
import { formatTweet } from "./utils/formatter";
import { PubmedError, PubmedErrorCodes } from "./error";

const SEARCH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

interface ExtendedRuntime extends IAgentRuntime {
    config: {
        pubmed?: {
            apiKey?: string;
        };
    };
    twitterClient: {
        createPost: (text: string) => Promise<void>;
        replyTo: (id: string, text: string) => Promise<void>;
    };
}

interface SchedulerMemory {
    type: "scheduler";
    id: string;
    content: { lastRun?: number };
    metadata: Record<string, unknown>;
    createdAt: number;
}

export class PubmedScheduler {
    private runtime: ExtendedRuntime;
    private memory: SchedulerMemory;

    constructor(runtime: ExtendedRuntime) {
        this.runtime = runtime;
        this.memory = {
            type: "scheduler",
            id: "pubmed-scheduler",
            content: { lastRun: undefined },
            metadata: {},
            createdAt: Date.now()
        };
    }

    async start(): Promise<void> {
        elizaLogger.info("Starting PubMed scheduler");
        await this.scheduleNextRun();
    }

    private async scheduleNextRun(): Promise<void> {
        const now = Date.now();
        const lastRun = this.memory.content.lastRun || 0;
        const nextRun = lastRun + SEARCH_INTERVAL;

        if (now >= nextRun) {
            await this.runScheduledTask();
            this.memory.content.lastRun = now;
        }

        // Schedule next run
        setTimeout(() => this.scheduleNextRun(), SEARCH_INTERVAL);
    }

    private async runScheduledTask(): Promise<void> {
        try {
            const results = await searchPubMed("medical research", {
                maxResults: 1,
                sortBy: "date"
            }, this.runtime.config);

            if (results.articles.length > 0) {
                const article = results.articles[0];
                const tweet = formatTweet(article);
                await this.runtime.twitterClient.createPost(tweet);
                elizaLogger.info("Posted scheduled research update", {
                    articleId: article.pmid
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                elizaLogger.error("Failed to run scheduled task:", error);
                throw new PubmedError(PubmedErrorCodes.API_ERROR, error.message);
            }
            throw new PubmedError(PubmedErrorCodes.API_ERROR, "Unknown error occurred");
        }
    }
}