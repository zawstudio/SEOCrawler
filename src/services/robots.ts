import chalk from 'chalk';
import robotsParser from 'robots-parser';
import { HttpClient } from './http';
import { getDomain } from '../utils';

export class RobotsManager {
  private httpClient: HttpClient;
  private cache: Map<string, any> = new Map();

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async getRobotsTxt(domain: string): Promise<any> {
    if (this.cache.has(domain)) {
      return this.cache.get(domain);
    }

    try {
      const robotsUrl = `${domain}/robots.txt`;
      const response = await this.httpClient.fetchPage(robotsUrl);

      if (response.statusCode === 200) {
        const robotsTxt = robotsParser(robotsUrl, response.data);
        this.cache.set(domain, robotsTxt);
        return robotsTxt;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async isAllowed(url: string, userAgent: string): Promise<boolean> {
    try {
      const domain = getDomain(url);
      const robotsTxt = await this.getRobotsTxt(domain);

      if (!robotsTxt) {
        return true;
      }

      return robotsTxt.isAllowed(url, userAgent) ?? true;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(chalk.red('[ERROR]') + ' ' + chalk.white(`Error checking robots.txt for ${url}:`), chalk.gray((error as Error).message));
      }
      return true;
    }
  }

  async getSitemaps(domain: string): Promise<string[]> {
    try {
      const robotsTxt = await this.getRobotsTxt(domain);

      if (!robotsTxt) {
        return [];
      }

      const sitemaps: string[] = [];
      const robotsContent = robotsTxt.toString();
      const sitemapMatches = robotsContent.matchAll(/Sitemap:\s*(.+)/gi);

      for (const match of sitemapMatches) {
        sitemaps.push(match[1].trim());
      }

      return sitemaps;
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(chalk.red('[ERROR]') + ' ' + chalk.white(`Error getting sitemaps from robots.txt:`), chalk.gray((error as Error).message));
      }
      return [];
    }
  }
}

