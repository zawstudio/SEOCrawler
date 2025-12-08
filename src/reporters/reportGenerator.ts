import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { createObjectCsvWriter } from 'csv-writer';
import { PageData, CrawlResult } from '../types';
import { ensureDirectoryExists, Logger } from '../utils';

export class ReportGenerator {
  private outputDir: string;
  private logger: Logger;

  constructor(outputDir: string = 'output') {
    this.outputDir = outputDir;
    this.logger = new Logger();
    ensureDirectoryExists(this.outputDir);
  }

  async generateAllReports(pages: PageData[], startUrl: string, crawlTime: number): Promise<void> {
    this.logger.newLine();
    this.logger.info('Generating reports...');
    this.logger.text(chalk.gray('Output directory: ') + chalk.blue(path.resolve(this.outputDir)));
    this.logger.newLine();

    await this.generateJsonReport(pages, startUrl, crawlTime);
    await this.generateCsvReport(pages);
    await this.generateLinksReport(pages);
    await this.generateErrorsReport(pages);
    await this.generateRedirectsReport(pages);
    await this.generateStats(pages, crawlTime);

    this.logger.newLine();
    this.logger.success('All reports generated successfully!');
  }

  async generateJsonReport(pages: PageData[], startUrl: string, crawlTime: number): Promise<void> {
    const result: CrawlResult = {
      pages: pages,
      totalPages: pages.length,
      totalErrors: pages.filter(p => p.error || p.statusCode >= 400).length,
      crawlTime: crawlTime,
      startUrl: startUrl,
    };

    const jsonPath = path.join(this.outputDir, 'results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    this.logger.success('JSON report saved to: ' + chalk.blue.underline(jsonPath));
  }

  async generateCsvReport(pages: PageData[]): Promise<void> {
    const csvPath = path.join(this.outputDir, 'results.csv');

    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'url', title: 'URL' },
        { id: 'statusCode', title: 'Status' },
        { id: 'finalUrl', title: 'FinalURL' },
        { id: 'depth', title: 'Depth' },
        { id: 'linksCount', title: 'LinksCount' },
        { id: 'title', title: 'Title' },
        { id: 'metaDescription', title: 'MetaDescription' },
        { id: 'h1', title: 'H1' },
        { id: 'loadTime', title: 'LoadTime(ms)' },
        { id: 'error', title: 'Error' },
      ],
    });

    const records = pages.map(page => ({
      url: page.url,
      statusCode: page.statusCode,
      finalUrl: page.finalUrl,
      depth: page.depth,
      linksCount: page.outgoingLinks.length,
      title: page.title || '',
      metaDescription: page.metaDescription || '',
      h1: page.h1 || '',
      loadTime: page.loadTime || 0,
      error: page.error || '',
    }));

    await csvWriter.writeRecords(records);

    this.logger.success('CSV report saved to: ' + chalk.blue.underline(csvPath));
  }

  async generateLinksReport(pages: PageData[]): Promise<void> {
    const linksPath = path.join(this.outputDir, 'links.json');

    const linksData = pages.map(page => ({
      url: page.url,
      outgoingLinks: page.outgoingLinks,
      linksCount: page.outgoingLinks.length,
    }));

    fs.writeFileSync(linksPath, JSON.stringify(linksData, null, 2), 'utf-8');

    this.logger.success('Links report saved to: ' + chalk.blue.underline(linksPath));
  }

  async generateErrorsReport(pages: PageData[]): Promise<void> {
    const errors = pages.filter(p => p.error || p.statusCode >= 400);

    if (errors.length === 0) {
      this.logger.success('No errors found!');
      return;
    }

    const errorsPath = path.join(this.outputDir, 'errors.json');
    fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2), 'utf-8');

    this.logger.warning('Errors report saved to: ' + chalk.blue.underline(errorsPath) + ` (${errors.length} errors)`);
  }

  async generateRedirectsReport(pages: PageData[]): Promise<void> {
    const redirects = pages.filter(p => p.statusCode >= 300 && p.statusCode < 400);

    if (redirects.length === 0) {
      this.logger.success('No redirects found!');
      return;
    }

    const redirectsPath = path.join(this.outputDir, 'redirects.json');
    fs.writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2), 'utf-8');

    this.logger.warning('Redirects report saved to: ' + chalk.blue.underline(redirectsPath) + ` (${redirects.length} redirects)`);
  }

  async generateStats(pages: PageData[], crawlTime: number): Promise<void> {
    const stats = {
      totalPages: pages.length,
      totalErrors: pages.filter(p => p.error || p.statusCode >= 400).length,
      statusCodes: this.countStatusCodes(pages),
      depthDistribution: this.countDepthDistribution(pages),
      avgLoadTime: this.calculateAvgLoadTime(pages),
      crawlTime: crawlTime,
      crawlTimeFormatted: `${(crawlTime / 1000).toFixed(2)}s`,
    };

    const statsPath = path.join(this.outputDir, 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');

    this.logger.success('Statistics saved to: ' + chalk.blue.underline(statsPath));
  }

  private countStatusCodes(pages: PageData[]): Record<number, number> {
    const counts: Record<number, number> = {};
    pages.forEach(page => {
      counts[page.statusCode] = (counts[page.statusCode] || 0) + 1;
    });
    return counts;
  }

  private countDepthDistribution(pages: PageData[]): Record<number, number> {
    const counts: Record<number, number> = {};
    pages.forEach(page => {
      counts[page.depth] = (counts[page.depth] || 0) + 1;
    });
    return counts;
  }

  private calculateAvgLoadTime(pages: PageData[]): number {
    const loadTimes = pages.filter(p => p.loadTime).map(p => p.loadTime!);
    if (loadTimes.length === 0) return 0;
    return Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
  }
}

