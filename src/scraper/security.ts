import { URL } from 'url';

/**
 * Validates whether a target URL is safe to fetch according to SSRF policies.
 * In production: blocks private, loopback, link-local, and cloud metadata addresses.
 * When ALLOW_PRIVATE_NETWORK === 'true' or in test environments (NODE_ENV === 'test'):
 * allows localhost / 127.0.0.1 so batch evaluation fixtures (http://localhost:8099/...) succeed.
 */
export function isSafeUrl(targetUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(targetUrl);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Invalid protocol: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check for private network / localhost allowance
    const allowPrivate =
      process.env.ALLOW_PRIVATE_NETWORK === 'true' ||
      process.env.ALLOW_LOCALHOST === 'true' ||
      process.env.NODE_ENV === 'test';

    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLoopback) {
      if (allowPrivate) {
        return { safe: true };
      }
      return { safe: false, reason: 'SSRF Intercept: Loopback address blocked in production unless ALLOW_PRIVATE_NETWORK=true' };
    }

    // Always block cloud metadata services (e.g. AWS 169.254.169.254, GCP metadata.google.internal)
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, reason: 'SSRF Intercept: Cloud metadata endpoint blocked' };
    }

    // Check for IPv4 private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) {
        if (allowPrivate) return { safe: true };
        return { safe: false, reason: 'SSRF Intercept: Loopback address blocked in production' };
      }
      // 10.0.0.0/8 (Private Class A)
      if (octet1 === 10) {
        if (allowPrivate) return { safe: true };
        return { safe: false, reason: 'SSRF Intercept: Private class A network blocked' };
      }
      // 172.16.0.0/12 (Private Class B)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        if (allowPrivate) return { safe: true };
        return { safe: false, reason: 'SSRF Intercept: Private class B network blocked' };
      }
      // 192.168.0.0/16 (Private Class C)
      if (octet1 === 192 && octet2 === 168) {
        if (allowPrivate) return { safe: true };
        return { safe: false, reason: 'SSRF Intercept: Private class C network blocked' };
      }
      // 169.254.0.0/16 (Link-local)
      if (octet1 === 169 && octet2 === 254) {
        return { safe: false, reason: 'SSRF Intercept: Link-local network blocked' };
      }
      // 0.0.0.0
      if (octet1 === 0) {
        return { safe: false, reason: 'SSRF Intercept: Current network address blocked' };
      }
    }

    return { safe: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { safe: false, reason: `Malformed URL: ${msg}` };
  }
}

/**
 * Sanitizes untrusted crawled content or user JD text against prompt injection attacks
 * and wraps in explicit boundary tags for the model.
 */
export function sanitizeAndWrapUntrusted(
  rawText: string,
  sourceLabel: string
): string {
  if (!rawText) return `<untrusted_data source="${sourceLabel}">None</untrusted_data>`;

  // Neutralize common prompt injection trigger phrases
  let cleaned = rawText
    .replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|system)\s+instructions/gi, '[neutralized instruction bypass attempt]')
    .replace(/you\s+are\s+now\s+in\s+developer\s+mode/gi, '[neutralized privilege escalation]')
    .replace(/SYSTEM\s*:\s*/gi, 'SYSTEM_TEXT: ')
    .replace(/ASSISTANT\s*:\s*/gi, 'ASSISTANT_TEXT: ')
    .replace(/USER\s*:\s*/gi, 'USER_TEXT: ');

  // Truncate to reasonable character boundary (e.g. 15,000 characters) to avoid context exhaustion
  if (cleaned.length > 15000) {
    cleaned = cleaned.slice(0, 15000) + '... [truncated]';
  }

  return `<untrusted_content source="${sourceLabel}">\n${cleaned}\n</untrusted_content>`;
}
