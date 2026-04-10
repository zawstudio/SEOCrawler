import { chromium, Browser, Page } from 'playwright';
import { ParseResult } from './htmlParser';
import { ScrapedLink } from '../types';
import { normalizeUrl, isSameDomain } from '../utils';

export class PlaywrightParser {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
  }

  async parsePage(url: string): Promise<ParseResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page: Page = await this.browser.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      const title = await page.title();
      const canonical = await page.$eval(
        'link[rel="canonical"]',
        (el) => (el as HTMLLinkElement).href
      ).catch(() => undefined);
      const robots = await page.$eval(
        'meta[name="robots"]',
        (el) => el.getAttribute('content')
      ).catch(() => undefined) || undefined;

      const metaDescription = await page.$eval(
        'meta[name="description"]',
        (el) => el.getAttribute('content')
      ).catch(() => undefined) || undefined;

      const h1 = await page.$eval('h1', (el) => el.textContent).catch(() => undefined) || undefined;

      const rawLinks = await page.$$eval('a[href]', (anchors) =>
        anchors.map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || '',
          rel: a.getAttribute('rel') || '',
        }))
      );

      const links: ScrapedLink[] = rawLinks.map(link => ({
        url: normalizeUrl(link.href),
        originalHref: link.href,
        text: link.text,
        isNofollow: link.rel.toLowerCase().includes('nofollow'),
        isInternal: isSameDomain(url, link.href)
      }));

      // Deduplicate by normalized URL
      const uniqueLinks = Array.from(new Map(links.map(l => [l.url, l])).values());

      return {
        title: title || undefined,
        metaDescription: metaDescription || undefined,
        canonical,
        robots,
        h1: h1?.trim() || undefined,
        links: uniqueLinks,
      };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

