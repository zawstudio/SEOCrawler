import * as cheerio from 'cheerio';
import chalk from 'chalk';
import { resolveUrl, isValidUrl } from '../utils';

export interface ParseResult {
  title?: string;
  metaDescription?: string;
  h1?: string;
  links: string[];
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
    const h1 = $('h1').first().text().trim() || undefined;

    const links = this.extractLinks($, baseUrl);

    return {
      title,
      metaDescription,
      h1,
      links,
    };
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const seenLinks = new Set<string>();

    const allLinks = $('a');
    if (this.debug) {
      console.log(chalk.magenta('[DEBUG]') + ' ' + chalk.white(`Found ${chalk.bold(allLinks.length)} <a> tags on `) + chalk.gray(baseUrl));
    }

    $('a').each((_: number, element: any) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();

      if (this.debug && href) {
        console.log(chalk.gray(`  Link: "${href}" (text: "${text.substring(0, 30)}...")`));
      }

      if (href) {
        const absoluteUrl = resolveUrl(baseUrl, href);

        if (this.debug) {
          console.log(chalk.blue(`    → Resolved to: `) + chalk.gray(absoluteUrl));
          const validColor = isValidUrl(absoluteUrl) ? chalk.green : chalk.red;
          console.log(chalk.blue(`    → Valid: `) + validColor(isValidUrl(absoluteUrl)));
        }

        if (isValidUrl(absoluteUrl) && !seenLinks.has(absoluteUrl)) {
          seenLinks.add(absoluteUrl);
          links.push(absoluteUrl);

          if (this.debug) {
            console.log(chalk.green(`    [+] Added to links`));
          }
        }
      }
    });

    if (this.debug) {
      console.log(chalk.magenta('[DEBUG]') + ' ' + chalk.white(`Total unique links found: `) + chalk.bold.green(links.length));
      links.slice(0, 10).forEach(link => console.log(chalk.gray(`  - ${link}`)));
      if (links.length > 10) {
        console.log(chalk.gray(`  ... and ${links.length - 10} more`));
      }
    }

    return links;
  }
}

