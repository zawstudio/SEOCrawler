import { Command } from 'commander';
import chalk from 'chalk';
import { Crawler } from './core';
import { ReportGenerator } from './reporters';
import { CrawlOptions, PageData } from './types';
import { isValidUrl, Logger } from './utils';

function displayConsoleSummary(pages: PageData[], startUrl: string, crawlTime: number): void {
  const logger = new Logger();

  logger.header('CRAWL SUMMARY');
  logger.separator();
  logger.text('Starting URL: ' + chalk.blue.underline(startUrl));
  logger.text('Total pages crawled: ' + chalk.green.bold(pages.length));
  logger.text('Crawl time: ' + chalk.yellow.bold(`${(crawlTime / 1000).toFixed(2)}s`));

  const totalErrors = pages.filter(p => p.error || p.statusCode >= 400).length;
  const errorText = totalErrors > 0 ? chalk.red.bold(totalErrors) : chalk.green.bold(totalErrors);
  logger.text('Total errors: ' + errorText);

  const statusCodes: Record<number, number> = {};
  pages.forEach(p => {
    statusCodes[p.statusCode] = (statusCodes[p.statusCode] || 0) + 1;
  });

  logger.subheader('STATUS CODES:');
  Object.entries(statusCodes).sort().forEach(([code, count]) => {
    logger.statusCode(parseInt(code), count);
  });

  const depthDist: Record<number, number> = {};
  pages.forEach(p => {
    depthDist[p.depth] = (depthDist[p.depth] || 0) + 1;
  });

  logger.subheader('DEPTH DISTRIBUTION:');
  const maxCount = Math.max(...Object.values(depthDist));
  Object.entries(depthDist).sort().forEach(([depth, count]) => {
    logger.depthBar(parseInt(depth), count, maxCount);
  });

  const loadTimes = pages.filter(p => p.loadTime).map(p => p.loadTime!);
  if (loadTimes.length > 0) {
    const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
    const minLoadTime = Math.min(...loadTimes);
    const maxLoadTime = Math.max(...loadTimes);
    logger.subheader('PERFORMANCE:');
    logger.text(`  Average load time: ${chalk.yellow.bold(avgLoadTime + 'ms')}`);
    logger.text(`  Min: ${chalk.green(minLoadTime + 'ms')} | Max: ${chalk.red(maxLoadTime + 'ms')}`);
  }

  const errors = pages.filter(p => p.error || p.statusCode >= 400);
  if (errors.length > 0) {
    logger.subheader('ERRORS:');
    errors.slice(0, 10).forEach(p => {
      logger.text(`  ${chalk.red(p.statusCode)} - ${chalk.gray(p.url)}`);
      if (p.error) logger.text(`      ${chalk.red('Error:')} ${chalk.white(p.error)}`);
    });
    if (errors.length > 10) {
      logger.text(chalk.gray(`  ... and ${errors.length - 10} more errors`));
    }
  } else {
    logger.success('NO ERRORS FOUND!');
  }

  const redirects = pages.filter(p => p.statusCode >= 300 && p.statusCode < 400);
  if (redirects.length > 0) {
    logger.subheader('REDIRECTS:');
    redirects.slice(0, 5).forEach(p => {
      logger.text(`  ${chalk.yellow(p.statusCode)} - ${chalk.gray(p.url)} ${chalk.white('→')} ${chalk.blue(p.finalUrl)}`);
    });
    if (redirects.length > 5) {
      logger.text(chalk.gray(`  ... and ${redirects.length - 5} more redirects`));
    }
  }

  logger.tip('Use ' + chalk.yellow('--save-reports') + ' flag to save detailed reports to files');
  logger.separator();
}

const program = new Command();

program
  .name('seo-crawler')
  .description('SEO Crawler - Crawl websites and analyze SEO')
  .version('1.0.0')
  .argument('<url>', 'URL to start crawling from')
  .option('-d, --max-depth <number>', 'Maximum crawl depth', '3')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl', '100')
  .option('-c, --concurrency <number>', 'Number of concurrent requests', '5')
  .option('-r, --render', 'Use Playwright for JavaScript rendering', false)
  .option('-t, --timeout <number>', 'Request timeout in milliseconds', '30000')
  .option('--retries <number>', 'Number of retries for failed requests', '3')
  .option('--rate-limit <number>', 'Maximum requests per second', '10')
  .option('--user-agent <string>', 'Custom User-Agent', 'SEO-Crawler/1.0')
  .option('--ignore-robots', 'Ignore robots.txt rules', false)
  .option('--debug', 'Enable debug mode', false)
  .option('--save-reports', 'Save reports to files', false)
  .option('-o, --output <directory>', 'Output directory for reports', 'output')
  .option('--include-paths <paths>', 'Additional paths to crawl (comma-separated)', '')
  .action(async (url: string, options: any) => {
    const logger = new Logger(options.debug);

    if (!isValidUrl(url)) {
      logger.error('Invalid URL provided');
      logger.text(chalk.gray('Please provide a valid HTTP or HTTPS URL.'));
      process.exit(1);
    }

    const crawlOptions: CrawlOptions = {
      maxDepth: parseInt(options.maxDepth),
      maxPages: parseInt(options.maxPages),
      concurrency: parseInt(options.concurrency),
      render: options.render,
      timeout: parseInt(options.timeout),
      retries: parseInt(options.retries),
      rateLimit: parseInt(options.rateLimit),
      userAgent: options.userAgent,
      respectRobotsTxt: !options.ignoreRobots,
      debug: options.debug,
    };

    logger.box('SEO CRAWLER');

    try {
      const crawler = new Crawler(crawlOptions);

      if (options.includePaths) {
        const paths = options.includePaths.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        const baseUrl = new URL(url);
        logger.info(`Adding ${paths.length} additional paths to crawl:`);

        for (const path of paths) {
          const fullUrl = `${baseUrl.protocol}//${baseUrl.host}${path.startsWith('/') ? path : '/' + path}`;
          if (isValidUrl(fullUrl)) {
            logger.listItem(chalk.gray(fullUrl), 'success');
            crawler.addUrlToCrawl(fullUrl, 0);
          } else {
            logger.listItem(chalk.gray(fullUrl) + chalk.red(' (invalid URL)'), 'error');
          }
        }
        logger.newLine();
      }

      const startTime = Date.now();
      const pages = await crawler.crawl(url);
      const crawlTime = Date.now() - startTime;

      if (options.saveReports) {
        const reportGenerator = new ReportGenerator(options.output);
        await reportGenerator.generateAllReports(pages, url, crawlTime);
      } else {
        displayConsoleSummary(pages, url, crawlTime);
      }

      logger.box('CRAWL COMPLETED', 'green');

      process.exit(0);
    } catch (error) {
      logger.error('Fatal error: ' + (error as Error).message);
      if (options.debug) {
        console.error(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  });

program.parse();

