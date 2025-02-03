// src/utils/formatter.ts
import { PubmedArticle } from '../types';

const TOPIC_EMOJIS: Record<string, string> = {
    'cancer': '🎗️',
    'heart': '❤️',
    'brain': '🧠',
    'covid': '🦠',
    'vaccine': '💉',
    'genetics': '🧬',
    'mental health': '🧘',
    'nutrition': '🥗',
    'exercise': '🏃',
    'sleep': '😴',
    'diabetes': '🩺',
    'obesity': '⚖️',
    'pediatrics': '👶',
    'aging': '👴',
    'drug': '💊',
    'surgery': '🏥',
    'research': '🔬',
    'study': '📊',
    'treatment': '💉',
    'therapy': '🤝'
};

function getRelevantEmoji(text: string): string {
    const lowercaseText = text.toLowerCase();
    for (const [keyword, emoji] of Object.entries(TOPIC_EMOJIS)) {
        if (lowercaseText.includes(keyword)) {
            return emoji;
        }
    }
    return '🔬'; // Default research emoji
}

export function formatTweet(article: PubmedArticle): string {
    // Get relevant emoji based on title/content
    const emoji = getRelevantEmoji(article.title);

    // Format title (max 150 chars)
    const title = article.title.length > 150
        ? article.title.substring(0, 147) + '...'
        : article.title;

    // Format authors
    const authorText = article.authors.length > 3
        ? `${article.authors[0]} et al.`
        : article.authors.join(', ');

    // Create an engaging tweet with proper spacing and formatting
    return [
        `${emoji} NEW RESEARCH: ${title}`,
        '',
        `📚 Published in: ${article.journal} (${article.year})`,
        `👥 Authors: ${authorText}`,
        '',
        '🔗 Read more:',
        article.url,
        '',
        '#MedicalResearch #Science'
    ].join('\n');
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

export function formatThreadReply(article: PubmedArticle): string {
    const emoji = getRelevantEmoji(article.title);

    return [
        `${emoji} Here's what I found:`,
        '',
        article.title,
        '',
        article.abstract ? `Key findings: ${article.abstract.substring(0, 200)}...` : '',
        '',
        `Read more: ${article.url}`,
        '#MedicalResearch'
    ].filter(Boolean).join('\n');
}
