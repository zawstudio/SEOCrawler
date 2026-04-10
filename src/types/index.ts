export interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  concurrency: number;
  render: boolean;
  timeout: number;
  retries: number;
  rateLimit: number;
  userAgent: string;
  respectRobotsTxt: boolean;
  debug?: boolean;
}

export interface ScrapedLink {
  url: string;
  originalHref: string;
  text: string;
  isNofollow: boolean;
  isInternal: boolean;
}

export interface PageData {
  url: string;
  statusCode: number;
  finalUrl: string;
  depth: number;
  outgoingLinks: ScrapedLink[];
  redirectChain: string[];
  error?: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  loadTime?: number;
}

export interface CrawlResult {
  pages: PageData[];
  totalPages: number;
  totalErrors: number;
  crawlTime: number;
  startUrl: string;
}

