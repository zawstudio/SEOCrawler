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

export interface ScrapedImage {
  url: string;
  alt: string;
  isInternal: boolean;
}

export interface PageData {
  url: string;
  statusCode: number;
  finalUrl: string;
  depth: number;
  outgoingLinks: ScrapedLink[];
  images: ScrapedImage[];
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  redirectChain: string[];
  error?: string;
  title?: string;
  metaDescription?: string;
  loadTime?: number;
}

export interface CrawlResult {
  pages: PageData[];
  totalPages: number;
  totalErrors: number;
  crawlTime: number;
  startUrl: string;
}

