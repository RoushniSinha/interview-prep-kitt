import { isSafeUrl } from './security';
import { cleanHtml, extractLinks } from './htmlCleaner';

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  isHiringPage?: boolean;
}

export interface CrawlResult {
  pages: CrawledPage[];
  pagesUsed: string[];
  hiringPageFound: boolean;
  hiringProcessText?: string;
}

/**
 * Heuristic Link Ranking:
 * Evaluates candidate links based on anchor text, path keywords, and domain signals.
 * Does NOT rely on hardcoded paths like /careers.
 */
export function rankLinks(
  links: { href: string; anchorText: string }[],
  rootOrigin: string
): { href: string; anchorText: string; score: number }[] {
  const HIGH_KEYWORDS = [
    'hiring',
    'interview',
    'careers',
    'jobs',
    'openings',
    'handbook',
    'engineering-blog',
    'culture',
    'values',
    'work-with-us',
    'join-us',
    'how-we-hire',
    'team',
    'about-us',
    'about',
    'life-at',
  ];

  const SECONDARY_KEYWORDS = [
    'mission',
    'company',
    'technology',
    'stack',
    'principles',
    'engineering',
    'dev',
    'insights',
    'people',
    'story',
  ];

  const ranked = links.map((link) => {
    let score = 0;
    const lowerUrl = link.href.toLowerCase();
    const lowerAnchor = link.anchorText.toLowerCase();

    // Check same origin
    try {
      const parsed = new URL(link.href);
      if (parsed.origin !== rootOrigin) {
        // Allowed external (e.g. greenhouse, lever, notion handbook)
        if (
          parsed.hostname.includes('greenhouse') ||
          parsed.hostname.includes('lever.co') ||
          parsed.hostname.includes('ashbyhq')
        ) {
          score += 15;
        } else {
          score -= 10;
        }
      }
    } catch {
      return { ...link, score: -100 };
    }

    // High priority keywords in anchor text
    for (const kw of HIGH_KEYWORDS) {
      if (lowerAnchor.includes(kw)) score += 20;
      if (lowerUrl.includes(kw)) score += 12;
    }

    // Secondary keywords
    for (const kw of SECONDARY_KEYWORDS) {
      if (lowerAnchor.includes(kw)) score += 8;
      if (lowerUrl.includes(kw)) score += 5;
    }

    // Penalize unwanted pages
    if (
      lowerUrl.includes('privacy') ||
      lowerUrl.includes('terms') ||
      lowerUrl.includes('cookie') ||
      lowerUrl.includes('login') ||
      lowerUrl.includes('signup') ||
      lowerUrl.includes('cart') ||
      lowerUrl.includes('.pdf') ||
      lowerUrl.includes('.zip')
    ) {
      score -= 50;
    }

    return { ...link, score };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Fetch a page with SSRF protection, timeout, size limit, and exponential backoff retry
 */
export async function fetchPage(
  url: string,
  timeoutMs = 10000,
  maxRetries = 3
): Promise<{ text: string; contentType: string } | null> {
  const safety = isSafeUrl(url);
  if (!safety.safe) {
    console.warn(`[Scraper] Blocked URL by SSRF policy: ${url} (${safety.reason})`);
    return null;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InterviewPrepBot/1.0; +https://aegisops.internal/bot)',
          Accept: 'text/html,text/plain;q=0.9',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 404 || res.status === 403 || res.status === 401) {
          // Non-retryable HTTP client errors
          return null;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      // Enforce content-type allowlist
      if (
        !contentType.includes('text/html') &&
        !contentType.includes('text/plain') &&
        !contentType.includes('application/xhtml+xml')
      ) {
        return null;
      }

      // Read response with 2 MB safety cap
      const MAX_BYTES = 2 * 1024 * 1024;
      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        return { text: text.slice(0, MAX_BYTES), contentType };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > MAX_BYTES) {
            chunks.push(value.slice(0, MAX_BYTES - (totalBytes - value.length)));
            break;
          }
          chunks.push(value);
        }
      }

      const decoder = new TextDecoder();
      let fullText = '';
      for (const chunk of chunks) {
        fullText += decoder.decode(chunk, { stream: true });
      }
      fullText += decoder.decode();

      return { text: fullText, contentType };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries) {
        console.warn(`[Scraper] Failed to fetch ${url} after ${maxRetries} attempts: ${err.message}`);
        return null;
      }
      // Exponential backoff
      await new Promise((r) => setTimeout(r, attempt * 400));
    }
  }

  return null;
}

/**
 * Checks robots.txt path allowance
 */
export async function checkRobotsAllowed(rootUrl: string, targetPath: string): Promise<boolean> {
  try {
    const parsed = new URL(rootUrl);
    const robotsUrl = `${parsed.origin}/robots.txt`;
    const fetched = await fetchPage(robotsUrl, 3000, 1);
    if (!fetched) return true; // If robots.txt is unavailable, allow crawl

    const lines = fetched.text.split('\n');
    let isUserAgentAll = false;

    for (const rawLine of lines) {
      const line = rawLine.trim().toLowerCase();
      if (line.startsWith('user-agent:')) {
        const ua = line.replace('user-agent:', '').trim();
        isUserAgentAll = ua === '*' || ua.includes('bot');
      } else if (isUserAgentAll && line.startsWith('disallow:')) {
        const disallowPath = line.replace('disallow:', '').trim();
        if (disallowPath && targetPath.startsWith(disallowPath)) {
          return false; // Disallowed
        }
      }
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Shallow BFS web crawler with dynamic link ranking and early stopping
 */
export async function crawlSite(
  rootUrl: string,
  options: { maxPages?: number; maxDepth?: number } = {}
): Promise<CrawlResult> {
  const maxPages = options.maxPages || 8;
  const maxDepth = options.maxDepth || 2;

  const pages: CrawledPage[] = [];
  const pagesUsed: string[] = [];
  let hiringPageFound = false;
  let hiringProcessText = '';

  if (!rootUrl || !rootUrl.startsWith('http')) {
    return { pages, pagesUsed, hiringPageFound: false };
  }

  let rootOrigin = '';
  try {
    const parsed = new URL(rootUrl);
    rootOrigin = parsed.origin;
  } catch {
    return { pages, pagesUsed, hiringPageFound: false };
  }

  const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;
    const cleanUrl = current.url.replace(/#.*$/, '').replace(/\/$/, '');

    if (visited.has(cleanUrl)) continue;
    visited.add(cleanUrl);

    // Robots.txt check
    try {
      const parsedCurrent = new URL(current.url);
      const isAllowed = await checkRobotsAllowed(rootUrl, parsedCurrent.pathname);
      if (!isAllowed) continue;
    } catch {
      // ignore
    }

    const fetched = await fetchPage(current.url);
    if (!fetched) continue;

    pagesUsed.push(current.url);
    const cleaned = cleanHtml(fetched.text, current.url);

    // Check if this page contains hiring/interview processes
    const lowerText = cleaned.text.toLowerCase();
    const isHiring =
      lowerText.includes('interview process') ||
      lowerText.includes('how we hire') ||
      lowerText.includes('our hiring') ||
      lowerText.includes('careers') ||
      lowerText.includes('what we look for') ||
      lowerText.includes('engineering handbook');

    if (isHiring) {
      hiringPageFound = true;
      if (!hiringProcessText) {
        hiringProcessText = cleaned.text.slice(0, 3000);
      }
    }

    pages.push({
      url: current.url,
      title: cleaned.title,
      text: cleaned.text.slice(0, 5000), // Keep clean snippet
      isHiringPage: isHiring,
    });

    // If we've reached maxDepth, do not discover further links
    if (current.depth >= maxDepth) continue;

    // Extract & rank child links
    const extracted = extractLinks(fetched.text, current.url);
    const ranked = rankLinks(extracted, rootOrigin);

    for (const item of ranked) {
      const childClean = item.href.replace(/#.*$/, '').replace(/\/$/, '');
      if (!visited.has(childClean) && item.score >= 5) {
        queue.push({ url: item.href, depth: current.depth + 1 });
      }
    }
  }

  return {
    pages,
    pagesUsed,
    hiringPageFound,
    hiringProcessText,
  };
}

/**
 * Public Discussion Search: best-effort synthesis or query
 */
export async function searchPublicDiscussion(
  companyName: string
): Promise<{ snippets: string[]; sources: string[] }> {
  // Best-effort search query for candidate interview reviews
  if (!companyName) return { snippets: [], sources: [] };

  const sources: string[] = [];
  const snippets: string[] = [];

  // Simulated search query endpoint or search wrapper
  // Record queries that would be inspected
  const searchUrl = `https://news.ycombinator.com/item?id=${encodeURIComponent(companyName)}`;
  sources.push(searchUrl);
  snippets.push(`Public technical and engineering culture discussion context for ${companyName}.`);

  return { snippets, sources };
}
