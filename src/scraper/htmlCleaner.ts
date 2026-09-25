/**
 * Lightweight HTML parser & cleaner without heavy browser dependencies.
 * Strips scripts, styles, navigations, footers, and extracts clean readable text.
 */
export function cleanHtml(html: string, url: string): { title: string; text: string; url: string } {
  if (!html) return { title: '', text: '', url };

  // 1. Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 2. Strip non-content tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // 3. Convert paragraphs, headings and breaks to newlines
  cleaned = cleaned
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // 4. Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // 5. Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');

  // 6. Normalize whitespace
  const lines = cleaned
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const text = lines.join('\n');

  return {
    title,
    text,
    url,
  };
}

/**
 * Extracts links from raw HTML with their anchor texts.
 */
export function extractLinks(
  html: string,
  baseUrl: string
): { href: string; anchorText: string }[] {
  const links: { href: string; anchorText: string }[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const rawAnchor = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Skip javascript:, mailto:, tel:, # anchors
    if (
      !rawHref ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref.startsWith('#')
    ) {
      continue;
    }

    try {
      const resolved = new URL(rawHref, baseUrl);
      links.push({
        href: resolved.href,
        anchorText: rawAnchor,
      });
    } catch {
      // Ignore invalid URLs
    }
  }

  // Deduplicate by URL (keeping longest anchor text)
  const dedupedMap = new Map<string, string>();
  for (const item of links) {
    // Strip trailing slash and hash for canonical matching
    const cleanUrl = item.href.replace(/#.*$/, '').replace(/\/$/, '');
    const existing = dedupedMap.get(cleanUrl);
    if (!existing || item.anchorText.length > existing.length) {
      dedupedMap.set(cleanUrl, item.anchorText);
    }
  }

  return Array.from(dedupedMap.entries()).map(([href, anchorText]) => ({
    href,
    anchorText,
  }));
}
