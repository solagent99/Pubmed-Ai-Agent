import { PubmedArticle } from '../types';

interface CacheData {
    articles: Record<string, PubmedArticle>;
    queries: Record<string, { ids: string[]; timestamp: number }>;
}

export class Cache {
    private cache: CacheData = {
        articles: {},
        queries: {}
    };

    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    addArticle(article: PubmedArticle): void {
        this.cache.articles[article.pmid] = article;
    }

    addQuery(query: string, ids: string[]): void {
        this.cache.queries[query] = {
            ids,
            timestamp: Date.now()
        };
    }

    getArticle(id: string): PubmedArticle | undefined {
        return this.cache.articles[id];
    }

    getQueryResults(query: string): string[] | undefined {
        const cached = this.cache.queries[query];
        if (!cached) return undefined;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            delete this.cache.queries[query];
            return undefined;
        }

        return cached.ids;
    }

    clear(): void {
        this.cache = {
            articles: {},
            queries: {}
        };
    }
}

export const cache = new Cache();
