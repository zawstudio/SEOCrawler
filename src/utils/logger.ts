import chalk from 'chalk';

export class Logger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  info(message: string, detail?: string): void {
    console.log(chalk.blue('[INFO]') + ' ' + chalk.white(message) + (detail ? ' ' + chalk.gray(detail) : ''));
  }

  success(message: string, detail?: string): void {
    console.log(chalk.green('[SUCCESS]') + ' ' + chalk.white(message) + (detail ? ' ' + chalk.gray(detail) : ''));
  }

  warning(message: string, detail?: string): void {
    console.log(chalk.yellow('[WARNING]') + ' ' + chalk.white(message) + (detail ? ' ' + chalk.gray(detail) : ''));
  }

  error(message: string, detail?: string): void {
    console.error(chalk.red('[ERROR]') + ' ' + chalk.white(message) + (detail ? ' ' + chalk.gray(detail) : ''));
  }

  crawling(depth: number, url: string): void {
    const depthColor = depth === 0 ? chalk.green : depth <= 2 ? chalk.yellow : chalk.red;
    console.log(chalk.blue('[CRAWL]') + depthColor(` [D:${depth}]`) + ' ' + chalk.gray(url));
  }

  crawlResult(statusCode: number, linksCount: number, loadTime?: number): void {
    const statusColor = statusCode >= 400 ? chalk.red :
                       statusCode >= 300 ? chalk.yellow : chalk.green;
    const statusText = statusColor(`${statusCode}`);
    const linksText = chalk.gray(` | ${linksCount} links`);
    const timeText = loadTime ? chalk.gray(` | ${loadTime}ms`) : '';
    console.log('   ' + statusText + linksText + timeText);
  }

  progress(current: number, inQueue: number): void {
    const pages = chalk.green.bold(`${current}`) + chalk.white(' pages crawled');
    const queue = chalk.yellow.bold(`${inQueue}`) + chalk.white(' in queue');
    console.log(chalk.cyan('[PROGRESS]') + ' ' + pages + chalk.gray(' | ') + queue);
  }

  header(title: string): void {
    console.log('\n' + chalk.bold.cyan(title));
  }

  subheader(title: string): void {
    console.log('\n' + chalk.bold.blue(title));
  }

  separator(): void {
    console.log('');
  }

  box(title: string, color: 'cyan' | 'green' | 'yellow' | 'red' = 'cyan'): void {
    const colorFn = chalk[color];
    console.log('\n' + colorFn.bold(title) + '\n');
  }

  debugLog(message: string, data?: any): void {
    if (this.debug) {
      console.log(chalk.magenta('[DEBUG]') + ' ' + chalk.gray(message));
      if (data !== undefined) {
        console.log(chalk.gray('  > ' + JSON.stringify(data, null, 2)));
      }
    }
  }

  listItem(text: string, status: 'success' | 'error' | 'info' = 'info'): void {
    const symbols = {
      success: chalk.green('>'),
      error: chalk.red('x'),
      info: chalk.blue('+')
    };
    console.log('   ' + symbols[status] + ' ' + chalk.white(text));
  }

  statusCode(code: number, count: number): void {
    let statusDisplay;
    let prefix;
    const codeNum = code;

    if (codeNum >= 400) {
      statusDisplay = chalk.red.bold(`${code}`);
      prefix = '[ERROR]';
    } else if (codeNum >= 300) {
      statusDisplay = chalk.yellow.bold(`${code}`);
      prefix = '[REDIRECT]';
    } else if (codeNum >= 200) {
      statusDisplay = chalk.green.bold(`${code}`);
      prefix = '[OK]';
    } else {
      statusDisplay = chalk.gray.bold(`${code}`);
      prefix = '[OTHER]';
    }

    console.log(`  ${chalk.gray(prefix)} ${statusDisplay}: ${chalk.white(count + ' pages')}`);
  }

  depthBar(depth: number, count: number, maxCount: number): void {
    const barLength = Math.min(Math.round((count / maxCount) * 50), 50);
    const bar = chalk.blue('-'.repeat(barLength));
    console.log(`  ${chalk.yellow('Depth ' + depth)}: ${chalk.white(count + ' pages')} ${bar}`);
  }

  setting(key: string, value: any): void {
    console.log(chalk.white(key + ': ') + chalk.yellow.bold(value));
  }

  text(message: string): void {
    console.log(chalk.white(message));
  }

  newLine(): void {
    console.log('');
  }

  blocked(message: string, url: string): void {
    console.log(chalk.red('[BLOCKED]') + ' ' + chalk.white(message) + ' ' + chalk.gray(url));
  }

  tip(message: string): void {
    console.log('\n' + chalk.bold.blue('[TIP]') + ' ' + chalk.white(message));
  }
}

export const defaultLogger = new Logger();

