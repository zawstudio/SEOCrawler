/**
 * Normalizes a URL to a consistent format for the crawler's "visited" set and reporting.
 * - Lowercases hostname
 * - Removes default ports (80, 443)
 * - Removes fragments (#)
 * - Removes trailing slashes for consistency
 * - Sorts query parameters (optional but good for deduplication)
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let normalized = `${urlObj.protocol}//${urlObj.hostname}`;

    if (urlObj.port && urlObj.port !== '80' && urlObj.port !== '443') {
      normalized += `:${urlObj.port}`;
    }

    let path = urlObj.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    } else if (path === '/') {
      path = '';
    }

    normalized += path;

    if (urlObj.search) {
      const params = new URLSearchParams(urlObj.search);
      params.sort();
      const search = params.toString();
      if (search) {
        normalized += `?${search}`;
      }
    }

    return normalized;
  } catch (error) {
    return url;
  }
}

/**
 * Resolves a relative URL against a base URL.
 */
export function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (error) {
    return relativeUrl;
  }
}

/**
 * Validates if the string is a crawlable URL (http or https).
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Checks if two URLs belong to the same domain.
 */
export function isSameDomain(url1: string, url2: string): boolean {
  try {
    const domain1 = new URL(url1).hostname;
    const domain2 = new URL(url2).hostname;
    return domain1 === domain2;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts the base domain (protocol + hostname) from a URL.
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}`;
  } catch (error) {
    return url;
  }
}

