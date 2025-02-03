import { XMLParser } from 'fast-xml-parser';
import { PubmedArticle } from '../types';

export class PubMedParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  parseSearchResponse(xmlData: string): PubmedArticle[] {
    const parsed = this.parser.parse(xmlData);
    const articles = parsed.PubmedArticleSet?.PubmedArticle || [];

    return articles.map((article: any) => this.transformArticle(article));
  }

  private transformArticle(article: any): PubmedArticle {
    const medlineCitation = article.MedlineCitation;
    const articleData = medlineCitation.Article;
    const pubDate = this.extractPubDate(articleData.Journal.JournalIssue.PubDate);
    const pmid = medlineCitation.PMID['#text'];

    return {
      pmid,
      title: articleData.ArticleTitle,
      abstract: this.extractAbstract(articleData.Abstract),
      authors: this.extractAuthors(articleData.AuthorList?.Author || []),
      journal: articleData.Journal.Title,
      year: pubDate.getFullYear().toString(),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    };
  }

  private extractAbstract(abstract: any): string | undefined {
    if (!abstract?.AbstractText) return undefined;
    if (Array.isArray(abstract.AbstractText)) {
      return abstract.AbstractText.map((text: any) => text['#text'] || text).join(' ');
    }
    return abstract.AbstractText['#text'] || abstract.AbstractText;
  }

  private extractAuthors(authors: any[]): string[] {
    if (!Array.isArray(authors)) {
      authors = [authors];
    }
    return authors
      .map(author => {
        const lastName = author.LastName || '';
        const foreName = author.ForeName || '';
        return `${lastName}${foreName ? ', ' + foreName : ''}`.trim();
      })
      .filter(name => name.length > 0);
  }

  private extractPubDate(pubDate: any): Date {
    const year = pubDate.Year || '1900';
    const month = pubDate.Month || '01';
    const day = pubDate.Day || '01';
    return new Date(`${year}-${month}-${day}`);
  }

  private extractDOI(eLocationID: any): string | undefined {
    if (!eLocationID) return undefined;
    if (Array.isArray(eLocationID)) {
      const doi = eLocationID.find(id => id['@_EIdType'] === 'doi');
      return doi ? doi['#text'] : undefined;
    }
    return eLocationID['@_EIdType'] === 'doi' ? eLocationID['#text'] : undefined;
  }
}
