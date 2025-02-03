import { PubmedArticle } from './types';

export async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatCitation(article: PubmedArticle): string {
    const authorText = article.authors.length > 3
        ? `${article.authors[0]} et al.`
        : article.authors.join(', ');

    return [
        `📚 Citation:`,
        `${authorText} (${article.year}).`,
        article.title,
        `${article.journal}.`,
        `PMID: ${article.pmid}`,
        '',
        `🔗 ${article.url}`
    ].join('\n');
}