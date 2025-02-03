import { IAgentRuntime, Memory } from "@elizaos/core";

// Define the Action interface based on Eliza's documentation
export interface Action {
    name: string;
    similes: string[];
    description: string;
    validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
    handler: (runtime: IAgentRuntime, message: Memory, state?: any) => Promise<boolean>;
    examples: Array<Array<{
        user: string;
        content: { text: string; action?: string };
    }>>;
}

// Export other types
export interface PubmedArticle {
    pmid: string;
    title: string;
    abstract: string;
    authors: string[];
    journal: string;
    publicationDate: string;
    doi?: string;
    url?: string;
}
