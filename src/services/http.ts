import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CrawlOptions } from '../types';
import { retryWithBackoff } from '../utils';

export interface HttpResponse {
  statusCode: number;
  finalUrl: string;
  redirectChain: string[];
  data: string;
  headers: Record<string, string>;
  loadTime: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private options: CrawlOptions;

  constructor(options: CrawlOptions) {
    this.options = options;
    this.client = axios.create({
      timeout: options.timeout,
      maxRedirects: 10,
      validateStatus: () => true,
      headers: {
        'User-Agent': options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });
  }

  async fetchPage(url: string): Promise<HttpResponse> {
    const startTime = Date.now();

    const response = await retryWithBackoff(
      async () => {
        return await this.client.get(url, {
          maxRedirects: 10,
        });
      },
      this.options.retries
    );

    const loadTime = Date.now() - startTime;

    return this.processResponse(url, response, loadTime);
  }

  private processResponse(
    originalUrl: string,
    response: AxiosResponse,
    loadTime: number
  ): HttpResponse {
    const redirectChain = this.extractRedirectChain(response);
    const finalUrl = response.request?.res?.responseUrl || response.config.url || originalUrl;

    return {
      statusCode: response.status,
      finalUrl: finalUrl,
      redirectChain: redirectChain,
      data: response.data,
      headers: this.normalizeHeaders(response.headers),
      loadTime: loadTime,
    };
  }

  private extractRedirectChain(response: AxiosResponse): string[] {
    const chain: string[] = [];

    if (response.request && response.request.res) {
      const res = response.request.res;

      if (res.responseUrl && res.responseUrl !== response.config.url) {
        chain.push(response.config.url || '');
      }
    }

    return chain;
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (typeof headers === 'object') {
      Object.keys(headers).forEach(key => {
        normalized[key.toLowerCase()] = String(headers[key]);
      });
    }

    return normalized;
  }

  async fetchHeaders(url: string): Promise<HttpResponse> {
    const startTime = Date.now();

    const response = await retryWithBackoff(
      async () => {
        return await this.client.head(url);
      },
      this.options.retries
    );

    const loadTime = Date.now() - startTime;

    return {
      statusCode: response.status,
      finalUrl: response.request?.res?.responseUrl || response.config.url || url,
      redirectChain: [],
      data: '',
      headers: this.normalizeHeaders(response.headers),
      loadTime: loadTime,
    };
  }
}

