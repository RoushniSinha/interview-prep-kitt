/**
 * Batch CLI Input Converter Utility
 * Converts any arbitrary text description, job description, and URL link into
 * the strict BatchCase JSON schema expected by the Batch CLI (Appendix B).
 */

import { BatchCase, BatchCaseSchema, StoredKit } from './types';

export interface ConvertTextInputOptions {
  id?: string;
  jd: string;
  company_url: string;
  days?: number;
}

/**
 * Normalizes an arbitrary web link into a valid URL or clean domain URL
 */
export function normalizeCompanyUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  let cleaned = rawUrl.trim();

  // If user pasted without protocol, prepend https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    return parsed.toString();
  } catch {
    return cleaned;
  }
}

/**
 * Derives a clean, readable alphanumeric slug ID from a link, description, or custom ID
 */
export function deriveCaseId(customId?: string, companyUrl?: string, jdText?: string): string {
  if (customId && customId.trim()) {
    return customId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');
  }

  let baseName = '';

  if (companyUrl && companyUrl.trim()) {
    try {
      const url = new URL(normalizeCompanyUrl(companyUrl));
      // Extract domain without www. or TLD
      const hostname = url.hostname.replace(/^www\./i, '');
      const parts = hostname.split('.');
      baseName = parts[0] || 'case';
    } catch {
      baseName = 'case';
    }
  }

  // Look for role title in the first 120 chars of the JD
  if (jdText && jdText.trim()) {
    const firstLine = jdText.trim().split('\n')[0].slice(0, 40);
    const cleanedRole = firstLine
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 20);
    if (cleanedRole) {
      baseName = baseName ? `${baseName}_${cleanedRole}` : cleanedRole;
    }
  }

  if (!baseName) baseName = 'case';
  const timestampSuffix = Math.floor(Date.now() / 1000).toString().slice(-4);
  return `${baseName}_${timestampSuffix}`;
}

/**
 * Converts a text description and link into a validated BatchCase object
 */
export function convertTextAndLinkToBatchCase(options: ConvertTextInputOptions): BatchCase {
  const normalizedUrl = normalizeCompanyUrl(options.company_url || '');
  const id = deriveCaseId(options.id, options.company_url, options.jd);
  const days = options.days && options.days > 0 ? options.days : 7;
  const jd = (options.jd || '').trim();

  const caseObj: BatchCase = {
    id,
    jd,
    company_url: normalizedUrl,
    days,
  };

  // Validate through Zod schema
  return BatchCaseSchema.parse(caseObj);
}

/**
 * Formats an array of BatchCases into pretty JSON ready for CLI execution
 */
export function formatBatchCasesJson(cases: BatchCase[]): string {
  return JSON.stringify(cases, null, 2);
}

/**
 * Generates the exact shell CLI command to run Batch evaluation with the given file name
 */
export function generateCliCommand(inputFilename = 'cases.json', outputFilename = 'kits.json'): string {
  return `npm run evaluate -- --input ${inputFilename} --output ${outputFilename}`;
}

/**
 * Transforms an array of user stored kits into strict BatchCase[] conforming to Appendix B.
 * Extracts the exact source JD, company URL, days, and derives clean deterministic IDs.
 */
export function convertStoredKitsToBatchCases(storedKits: StoredKit[]): BatchCase[] {
  return storedKits.map((item, index) => {
    const company = item.source?.company || (item.kit?.source?.company) || 'company';
    const role = item.source?.role || (item.kit?.role?.title) || 'role';
    const rawId = `${company}_${role}`;
    const id = deriveCaseId(rawId, item.source?.company_url, item.source?.jd);

    const jd =
      item.source?.jd?.trim() ||
      (item.kit
        ? `${item.kit.role?.title || ''}\n${(item.kit.role?.requirements || []).map((r) => r.text).join('\n')}`
        : `${role} at ${company}`);

    const company_url = normalizeCompanyUrl(item.source?.company_url || item.kit?.source?.company_url || '');
    const days = item.source?.days && item.source.days > 0 ? item.source.days : (item.kit?.schedule?.days_available || 7);

    return {
      id,
      jd,
      company_url,
      days,
    };
  });
}

