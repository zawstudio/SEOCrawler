import chalk from 'chalk';
import { XMLParser } from 'fast-xml-parser';
import { HttpClient } from './http';
import { isValidUrl } from '../utils';

export class SitemapManager {
  private httpClient: HttpClient;
  private parser: XMLParser;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
    this.parser = new XMLParser();
  }

  async findSitemaps(domain: string): Promise<string[]> {
    const commonPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml',
      '/sitemaps/sitemap.xml',
    ];

    const found: string[] = [];

    for (const path of commonPaths) {
      const url = `${domain}${path}`;
      try {
        const response = await this.httpClient.fetchHeaders(url);
        if (response.statusCode === 200) {
          found.push(url);
        }
      } catch (error) {
      }
    }

    return found;
  }

  async fetchSitemap(url: string): Promise<string[]> {
    try {
      const response = await this.httpClient.fetchPage(url);

      if (response.statusCode !== 200) {
        if (process.env.DEBUG) {
          console.log(chalk.yellow('[WARNING]') + ' ' + chalk.white(`Sitemap not found at ${url} (status: ${response.statusCode})`));
        }
        return [];
      }

      return this.parseSitemap(response.data);
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(chalk.red('[ERROR]') + ' ' + chalk.white(`Error fetching sitemap from ${url}:`), chalk.gray((error as Error).message));
      }
      return [];
    }
  }

  private parseSitemap(xmlData: string): string[] {
    try {
      const parsed = this.parser.parse(xmlData);

      const urls: string[] = [];

      if (parsed.sitemapindex) {
        const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
          ? parsed.sitemapindex.sitemap
          : [parsed.sitemapindex.sitemap];

        for (const sitemap of sitemaps) {
          if (sitemap && sitemap.loc) {
            urls.push(sitemap.loc);
          }
        }
      }

      if (parsed.urlset) {
        const urlEntries = Array.isArray(parsed.urlset.url)
          ? parsed.urlset.url
          : [parsed.urlset.url];

        for (const entry of urlEntries) {
          if (entry && entry.loc && isValidUrl(entry.loc)) {
            urls.push(entry.loc);
          }
        }
      }

      return urls;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(chalk.red('[ERROR]') + ' ' + chalk.white(`Error parsing sitemap XML:`), chalk.gray((error as Error).message));
      }
      return [];
    }
  }

  async fetchAllUrls(sitemapUrls: string[]): Promise<string[]> {
    const allUrls: string[] = [];

    for (const sitemapUrl of sitemapUrls) {
      const urls = await this.fetchSitemap(sitemapUrl);

      for (const url of urls) {
        if (url.includes('sitemap')) {
          const nestedUrls = await this.fetchSitemap(url);
          allUrls.push(...nestedUrls);
        } else {
          allUrls.push(url);
        }
      }
    }

    return [...new Set(allUrls)];
  }
}

