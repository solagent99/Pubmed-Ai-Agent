/// <reference types="node" />
import axios from 'axios';
import type { AxiosError } from 'axios';
import { elizaLogger } from '@elizaos/core';
import debug from 'debug';
import { PubmedError, PubmedErrorCodes } from '../error';
import type { PubmedArticle, PubMedSearchOptions } from '../types';

const debugLog = debug('eliza:pubmed:search');

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_MAX_RESULTS = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 334; // Ensure we don't exceed 3 requests per second

const api = axios.create({
    baseURL: PUBMED_API_BASE,
    timeout: 10000,
    headers: {
        'Accept': 'application/json'
    }
});

interface PubMedSearchResult {
    esearchresult: {
        idlist: string[];
        count?: number;
        retmax?: number;
        retstart?: number;
        querytranslation?: string;
        ERROR?: string;
    };
}

interface PubMedSummaryResult {
    result: {
        uids: string[];
        [key: string]: any;
    };
}

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function validateApiKey(config: any): string {
    const apiKey = config.pubmed?.apiKey?.trim();
    if (!apiKey) {
        throw new PubmedError(
            PubmedErrorCodes.INVALID_API_KEY,
            'PubMed API key is not configured in ElizaOS config'
        );
    }
    return apiKey;
}

export async function searchPubMed(
    query: string,
    options: PubMedSearchOptions = {},
    config: any
): Promise<{ articles: PubmedArticle[]; total: number }> {
    debugLog('Starting PubMed search with query: %s, options: %O', query, options);

    const apiKey = validateApiKey(config);
    const maxResults = Math.min(options.maxResults || DEFAULT_MAX_RESULTS, 100);
    let retryCount = 0;

    const handleWithRetry = async (): Promise<{ articles: PubmedArticle[]; total: number }> => {
        try {
            // Rate limiting delay
            await delay(RATE_LIMIT_DELAY_MS);

            const searchResponse = await api.get<PubMedSearchResult>('/esearch.fcgi', {
                params: {
                    db: 'pubmed',
                    term: query.trim(),
                    retmax: maxResults,
                    retmode: 'json',
                    api_key: apiKey,
                    sort: options.sortBy || 'relevance',
                    ...(options.fromDate && { mindate: options.fromDate }),
                    ...(options.toDate && { maxdate: options.toDate })
                }
            });

            if (searchResponse.data.esearchresult.ERROR) {
                throw new PubmedError(
                    PubmedErrorCodes.API_ERROR,
                    `PubMed search error: ${searchResponse.data.esearchresult.ERROR}`
                );
            }

            const ids = searchResponse.data.esearchresult.idlist;
            if (!ids.length) {
                return { articles: [], total: 0 };
            }

            // Rate limiting delay before summary request
            await delay(RATE_LIMIT_DELAY_MS);

            const summaryResponse = await api.get<PubMedSummaryResult>('/esummary.fcgi', {
                params: {
                    db: 'pubmed',
                    id: ids.join(','),
                    retmode: 'json',
                    api_key: apiKey
                }
            });

            const articles: PubmedArticle[] = ids.map(id => {
                const article = summaryResponse.data.result[id];
                const pubDate = new Date(article.pubdate);
                return {
                    id,
                    pmid: id,
                    title: article.title,
                    abstract: article.abstract,
                    authors: article.authors.map((author: { name: string }) => author.name),
                    publicationDate: pubDate.toISOString().split('T')[0],
                    year: pubDate.getFullYear().toString(),
                    journal: article.fulljournalname,
                    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                    doi: article.elocationid?.replace('doi: ', '')
                };
            });

            return {
                articles,
                total: searchResponse.data.esearchresult.count || articles.length
            };

        } catch (error) {
            if (error instanceof PubmedError) {
                throw error;
            }

            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 429 || axiosError.code === 'ECONNABORTED') {
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
                    debugLog(`Retrying after ${delayMs}ms (attempt ${retryCount}/${MAX_RETRIES})`);
                    await delay(delayMs);
                    return handleWithRetry();
                }
            }

            throw new PubmedError(
                PubmedErrorCodes.API_ERROR,
                'Failed to fetch PubMed results',
                error
            );
        }
    };

    return handleWithRetry();
}