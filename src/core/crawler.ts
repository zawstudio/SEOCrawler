import chalk from 'chalk';
import { CrawlOptions, PageData } from '../types';
import { HttpClient } from '../services';
import { HtmlParser, PlaywrightParser } from '../parsers';
import { RobotsManager } from '../services';
import { SitemapManager } from '../services';
import { normalizeUrl, isSameDomain, getDomain, delay, Logger } from '../utils';
import PQueue from 'p-queue';

interface QueueItem {
  url: string;
  depth: number;
}

export class Crawler {
  private options: CrawlOptions;
  private httpClient: HttpClient;
  private htmlParser: HtmlParser;
  private playwrightParser: PlaywrightParser | null = null;
  private robotsManager: RobotsManager;
  private sitemapManager: SitemapManager;
  private logger: Logger;

  private visitedUrls: Set<string> = new Set();
  private queue: QueueItem[] = [];
  private results: PageData[] = [];
  private errors: number = 0;
  private startTime: number = 0;
  private baseUrl: string = '';
  private baseDomain: string = '';
  private pQueue: PQueue;
  private lastRequestTime: number = 0;

  constructor(options: CrawlOptions) {
    this.options = options;
    this.logger = new Logger(options.debug);
    this.httpClient = new HttpClient(options);
    this.htmlParser = new HtmlParser();
    this.robotsManager = new RobotsManager(this.httpClient);
    this.sitemapManager = new SitemapManager(this.httpClient);

    if (options.debug) {
      this.htmlParser.setDebug(true);
    }

    if (options.render) {
      this.playwrightParser = new PlaywrightParser();
    }

    this.pQueue = new PQueue({ concurrency: options.concurrency });
  }

  async crawl(startUrl: string): Promise<PageData[]> {
    this.startTime = Date.now();
    this.baseUrl = normalizeUrl(startUrl);
    this.baseDomain = getDomain(this.baseUrl);

    this.logger.success('Starting crawl from: ' + chalk.blue.underline(this.baseUrl));
    this.logger.info('Settings:',
      `maxDepth=${chalk.yellow(this.options.maxDepth)}, ` +
      `maxPages=${chalk.yellow(this.options.maxPages)}, ` +
      `concurrency=${chalk.yellow(this.options.concurrency)}`);

    if (this.playwrightParser) {
      this.logger.info('Initializing Playwright (JavaScript rendering enabled)...');
      await this.playwrightParser.initialize();
    }

    if (this.options.respectRobotsTxt) {
      await this.loadSitemaps();
    }

    this.enqueueUrl(this.baseUrl, 0);

    await this.processQueue();

    if (this.playwrightParser) {
      await this.playwrightParser.close();
    }

    const crawlTime = Date.now() - this.startTime;
    this.logger.newLine();
    this.logger.success('Crawl completed!');
    this.logger.text('Total pages: ' + chalk.green.bold(this.results.length));
    const errorsText = this.errors > 0 ? chalk.red.bold(this.errors) : chalk.green.bold(this.errors);
    this.logger.text('Errors: ' + errorsText);
    this.logger.text('Time: ' + chalk.yellow.bold(`${(crawlTime / 1000).toFixed(2)}s`));

    return this.results;
  }

  private async loadSitemaps(): Promise<void> {
    try {
      this.logger.info('Loading sitemaps...');

      const sitemapUrls = await this.robotsManager.getSitemaps(this.baseDomain);

      if (sitemapUrls.length === 0) {
        const foundSitemaps = await this.sitemapManager.findSitemaps(this.baseDomain);
        sitemapUrls.push(...foundSitemaps);
      }

      if (sitemapUrls.length > 0) {
        this.logger.listItem(`Found ${chalk.bold(sitemapUrls.length)} sitemap(s)`, 'success');

        const urls = await this.sitemapManager.fetchAllUrls(sitemapUrls);

        this.logger.listItem(`Loaded ${chalk.bold(urls.length)} URLs from sitemap(s)`, 'success');

        let addedCount = 0;
        for (const url of urls) {
          if (isSameDomain(url, this.baseUrl)) {
            this.enqueueUrl(url, 0);
            addedCount++;
          }
        }
        this.logger.listItem(`Added ${chalk.bold(addedCount)} URLs to crawl queue`, 'info');
      } else {
        this.logger.warning('No sitemaps found, will discover URLs by crawling');
      }
    } catch (error) {
      this.logger.error('Error loading sitemaps:', (error as Error).message);
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.results.length < this.options.maxPages) {
      const batch = this.queue.splice(0, this.options.concurrency);

      await Promise.all(
        batch.map(item => this.pQueue.add(() => this.processUrl(item)))
      );
    }

    await this.pQueue.onIdle();
  }

  private async processUrl(item: QueueItem): Promise<void> {
    const { url, depth } = item;

    if (this.results.length >= this.options.maxPages) {
      return;
    }

    if (depth > this.options.maxDepth) {
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (this.visitedUrls.has(normalizedUrl)) {
      return;
    }

    this.visitedUrls.add(normalizedUrl);

    if (this.options.respectRobotsTxt) {
      const allowed = await this.robotsManager.isAllowed(url, this.options.userAgent);
      if (!allowed) {
        this.logger.blocked('Blocked by robots.txt:', url);
        return;
      }
    }

    await this.applyRateLimit();

    this.logger.crawling(depth, url);

    try {
      const pageData = await this.fetchAndParse(url, depth);
      this.results.push(pageData);

      this.logger.crawlResult(pageData.statusCode, pageData.outgoingLinks.length, pageData.loadTime);

      if (depth < this.options.maxDepth) {
        let addedLinks = 0;
        for (const link of pageData.outgoingLinks) {
          if (isSameDomain(link, this.baseUrl)) {
            this.enqueueUrl(link, depth + 1);
            addedLinks++;
          }
        }
        if (addedLinks > 0 && this.options.debug) {
          this.logger.debugLog(`Added ${addedLinks} new links to queue`);
        }
      }

      if (this.results.length % 10 === 0) {
        this.logger.progress(this.results.length, this.queue.length);
      }
    } catch (error) {
      this.errors++;
      this.logger.error('Error crawling:', url);
      this.logger.text(chalk.red('   └─ ') + chalk.white((error as Error).message));

      this.results.push({
        url: url,
        statusCode: 0,
        finalUrl: url,
        depth: depth,
        outgoingLinks: [],
        redirectChain: [],
        error: (error as Error).message,
      });
    }
  }

  private async fetchAndParse(url: string, depth: number): Promise<PageData> {
    let parseResult;
    let httpResponse;

    if (this.options.render && this.playwrightParser) {
      parseResult = await this.playwrightParser.parsePage(url);

      httpResponse = await this.httpClient.fetchHeaders(url);
    } else {
      httpResponse = await this.httpClient.fetchPage(url);
      parseResult = this.htmlParser.parseHtml(httpResponse.data, url);
    }

    return {
      url: url,
      statusCode: httpResponse.statusCode,
      finalUrl: httpResponse.finalUrl,
      depth: depth,
      outgoingLinks: parseResult.links,
      redirectChain: httpResponse.redirectChain,
      title: parseResult.title,
      metaDescription: parseResult.metaDescription,
      h1: parseResult.h1,
      loadTime: httpResponse.loadTime,
    };
  }

  private enqueueUrl(url: string, depth: number): void {
    const normalizedUrl = normalizeUrl(url);

    if (!this.visitedUrls.has(normalizedUrl) && !this.isInQueue(normalizedUrl)) {
      this.queue.push({ url: normalizedUrl, depth });
    }
  }

  private isInQueue(url: string): boolean {
    return this.queue.some(item => item.url === url);
  }

  private async applyRateLimit(): Promise<void> {
    if (this.options.rateLimit <= 0) return;

    const minInterval = 1000 / this.options.rateLimit;
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await delay(minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  getResults(): PageData[] {
    return this.results;
  }

  addUrlToCrawl(url: string, depth: number = 0): void {
    this.enqueueUrl(url, depth);
  }
}

