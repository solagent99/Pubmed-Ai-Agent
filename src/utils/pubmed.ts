import axios from 'axios';
import type { AxiosError } from 'axios';
import { PubmedArticle, PubMedSearchOptions, PubMedSearchResponse } from '../types';
import { rateLimiter } from './rateLimiter';
import { elizaLogger } from '@elizaos/core';

const PUBMED_API = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface PubMedApiResponse {
    esearchresult: {
        idlist: string[];
        count: string;
        retmax: string;
        retstart: string;
        querytranslation: string;
        ERROR?: string;
    };
}

interface PubMedSummaryResponse {
    result: {
        [key: string]: {
            uid: string;
            title: string;
            authors?: Array<{ name: string }>;
            abstract?: string;
            fulljournalname: string;
            pubdate: string;
            elocationid?: string;
        };
    };
}

interface PubMedConfig {
    pubmed?: {
        apiKey?: string;
    };
}

interface PubMedActionContext {
    input: Record<string, unknown>;
    config: Record<string, unknown>;
    twitterClient: {
        createPost: (text: string) => Promise<void>;
        replyTo: (id: string, text: string) => Promise<void>;
    };
}

export async function searchPubMed(
    query: string,
    options: PubMedSearchOptions,
    config: PubMedConfig
): Promise<PubMedSearchResponse> {
    const apiKey = config.pubmed?.apiKey;
    if (!apiKey) {
        throw new Error('PubMed API key not configured');
    }

    try {
        await rateLimiter.wait();

        // Search for IDs
        const searchResponse = await axios.get<PubMedApiResponse>(`${PUBMED_API}/esearch.fcgi`, {
            params: {
                db: 'pubmed',
                term: query,
                retmax: options.maxResults || 10,
                retmode: 'json',
                usehistory: 'y',
                api_key: apiKey,
                sort: options.sortBy || 'relevance',
                ...(options.fromDate && { mindate: options.fromDate }),
                ...(options.toDate && { maxdate: options.toDate })
            }
        });

        if (searchResponse.data.esearchresult.ERROR) {
            throw new Error(`PubMed API error: ${searchResponse.data.esearchresult.ERROR}`);
        }

        const ids = searchResponse.data.esearchresult.idlist;
        if (!ids.length) {
            return {
                articles: [],
                total: 0,
                query,
                timestamp: Date.now()
            };
        }

        await rateLimiter.wait();

        // Fetch article details
        const summaryResponse = await axios.get<PubMedSummaryResponse>(`${PUBMED_API}/esummary.fcgi`, {
            params: {
                db: 'pubmed',
                id: ids.join(','),
                retmode: 'json',
                api_key: apiKey
            }
        });

        const articles = formatArticles(summaryResponse.data.result, ids);

        return {
            articles,
            total: parseInt(searchResponse.data.esearchresult.count),
            query,
            timestamp: Date.now()
        };

    } catch (error) {
        elizaLogger.error('PubMed API error:', error);
        if (error instanceof Error) {
            const axiosError = error as AxiosError;
            if (axiosError.response) {
                throw new Error(`PubMed API request failed: ${axiosError.response.statusText}`);
            }
            throw new Error(`PubMed API request failed: ${error.message}`);
        }
        throw new Error('Unknown PubMed API error occurred');
    }
}

function formatArticles(data: PubMedSummaryResponse['result'], ids: string[]): PubmedArticle[] {
    return ids.map(id => {
        const article = data[id];
        const pubDate = new Date(article.pubdate);

        return {
            pmid: id,
            title: article.title,
            abstract: article.abstract || undefined,
            authors: article.authors?.map(author => author.name) || [],
            journal: article.fulljournalname,
            year: pubDate.getFullYear().toString(),
            doi: article.elocationid?.replace('doi: ', ''),
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
        };
    });
}

// Export the PubMed action
export const PubMedAction = {
    name: 'PUBMED_SEARCH',
    description: 'Search PubMed for medical research articles',
    parameters: {
        query: {
            type: 'string',
            required: true,
            description: 'Search query for PubMed articles'
        },
        maxResults: {
            type: 'number',
            required: false,
            default: 5,
            description: 'Maximum number of results to return'
        }
    },

    async execute(context: PubMedActionContext): Promise<{ success: boolean; data?: PubMedSearchResponse; error?: string }> {
        const { query, maxResults = 5 } = context.input as { query: string; maxResults?: number };

        try {
            const results = await searchPubMed(query, { maxResults }, context.config);
            return {
                success: true,
                data: results
            };
        } catch (error) {
            if (error instanceof Error) {
                return {
                    success: false,
                    error: `PubMed search failed: ${error.message}`
                };
            }
            return {
                success: false,
                error: 'Unknown error occurred'
            };
        }
    }
};
