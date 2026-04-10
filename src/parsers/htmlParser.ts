import * as cheerio from 'cheerio';
import chalk from 'chalk';
import { resolveUrl, isValidUrl, normalizeUrl, isSameDomain } from '../utils';
import { ScrapedLink, ScrapedImage } from '../types';

export interface ParseResult {
  title?: string;
  metaDescription?: string;
  canonical?: string;
  robots?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  links: ScrapedLink[];
  images: ScrapedImage[];
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

    const headings = this.extractHeadings($);
    const links = this.extractLinks($, baseUrl);
    const images = this.extractImages($, baseUrl);

    return {
      title,
      metaDescription,
      canonical,
      robots,
      headings,
      links,
      images,
    };
  }

  private extractHeadings($: cheerio.CheerioAPI) {
    return {
      h1: $('h1').map((_, el) => $(el).text().trim()).get(),
      h2: $('h2').map((_, el) => $(el).text().trim()).get(),
      h3: $('h3').map((_, el) => $(el).text().trim()).get(),
      h4: $('h4').map((_, el) => $(el).text().trim()).get(),
      h5: $('h5').map((_, el) => $(el).text().trim()).get(),
      h6: $('h6').map((_, el) => $(el).text().trim()).get(),
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

    return links;
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): ScrapedImage[] {
    const images: ScrapedImage[] = [];
    const seenUrls = new Set<string>();

    $('img').each((_: number, element) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      
      if (!src) return;

      const absoluteUrl = resolveUrl(baseUrl, src);
      
      if (isValidUrl(absoluteUrl)) {
        const normalizedUrl = normalizeUrl(absoluteUrl);
        
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          
          images.push({
            url: normalizedUrl,
            alt,
            isInternal: isSameDomain(baseUrl, normalizedUrl)
          });
        }
      }
    });

    return images;
  }
}
