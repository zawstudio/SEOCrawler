import * as cheerio from 'cheerio';
import chalk from 'chalk';
import { resolveUrl, isValidUrl, normalizeUrl, isSameDomain } from '../utils';
import { ScrapedLink } from '../types';

export interface ParseResult {
  title?: string;
  metaDescription?: string;
  canonical?: string;
  robots?: string;
  h1?: string;
  links: ScrapedLink[];
}

export class HtmlParser {
  private debug: boolean = false;

  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  parseHtml(html: string, baseUrl: string): ParseResult {
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim() || undefined;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
    const robots = $('meta[name="robots"]').attr('content')?.trim() || undefined;
    const h1 = $('h1').first().text().trim() || undefined;

    const links = this.extractLinks($, baseUrl);

    return {
      title,
      metaDescription,
      canonical,
      robots,
      h1,
      links,
    };
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): ScrapedLink[] {
    const links: ScrapedLink[] = [];
    const seenUrls = new Set<string>();

    $('a').each((_: number, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      const rel = $(element).attr('rel') || '';
      
      if (!href) return;

      const absoluteUrl = resolveUrl(baseUrl, href);
      
      if (isValidUrl(absoluteUrl)) {
        const normalizedUrl = normalizeUrl(absoluteUrl);
        
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          
          links.push({
            url: normalizedUrl,
            originalHref: href,
            text,
            isNofollow: rel.toLowerCase().includes('nofollow'),
            isInternal: isSameDomain(baseUrl, normalizedUrl)
          });
        }
      }
    });

    if (this.debug) {
      console.log(chalk.magenta('[DEBUG]') + ' ' + chalk.white(`Extracted ${chalk.bold.green(links.length)} unique links from ${baseUrl}`));
    }

    return links;
  }
}
