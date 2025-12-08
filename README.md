# SEO Crawler

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Professional, high-performance SEO crawler built with TypeScript for comprehensive website analysis. Designed for SEO audits, link validation, and site migration checks.

## Features

- **Fast & Concurrent** - Configurable concurrency with rate limiting and automatic retries
- **Broken Link Detection** - Identify 404s, 500s, and redirect chains (301, 302, 307, 308)
- **JavaScript Support** - Optional Playwright integration for SPA and React apps
- **Multiple Reports** - JSON, CSV, errors, redirects, and performance statistics
- **Sitemap Integration** - Automatic sitemap.xml and robots.txt parsing
- **Clean Output** - Minimalist CLI with colored logs and real-time progress

## Installation

```bash
npm install
```

## Usage

```bash
npm run dev https://example.com
npm run dev https://example.com -- --save-reports
npm run dev https://example.com -- -d 5 -p 500 --save-reports
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev <url>` | Run directly with ts-node (fast, for development) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start <url>` | Run compiled version (requires build first) |
| `npm run clean` | Remove dist and output folders |

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --max-depth <n>` | Maximum crawl depth | 3 |
| `-p, --max-pages <n>` | Maximum pages limit | 100 |
| `-c, --concurrency <n>` | Parallel requests | 5 |
| `-r, --render` | Enable Playwright/JS rendering | false |
| `--save-reports` | Generate output files | false |
| `--include-paths <paths>` | Force crawl specific paths (comma-separated) | - |
| `--debug` | Enable verbose logging | false |
| `--ignore-robots` | Ignore robots.txt rules | false |
| `-t, --timeout <ms>` | Request timeout | 30000 |
| `--rate-limit <n>` | Max requests per second | 10 |

## Examples

```bash
# Basic audit
npm run dev https://example.com -- --save-reports

# Deep crawl with custom settings
npm run dev https://example.com -- -d 10 -p 1000 --save-reports

# JavaScript-heavy site with Playwright
npm run dev https://spa-app.com -- -r --save-reports

# Include specific paths manually
npm run dev https://example.com -- --include-paths "/about,/contact,/services" --save-reports

# Debug mode
npm run dev https://example.com -- --debug -p 10
```

## Output Files

When using `--save-reports`, creates an `output/` directory with:

- **results.json** - Complete crawl data with all page details
- **results.csv** - Spreadsheet-friendly format for Excel/Google Sheets
- **errors.json** - All pages with 4xx/5xx status codes
- **redirects.json** - All redirect chains (301, 302, etc.)
- **links.json** - Link graph with relationships
- **stats.json** - Performance metrics and statistics

## License

MIT License - Free for personal and commercial use

