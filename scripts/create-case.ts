import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { BatchCase, BatchCaseSchema } from '../src/core/types';
import { convertTextAndLinkToBatchCase, deriveCaseId, normalizeCompanyUrl } from '../src/core/batchConverter';

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      jd: { type: 'string', short: 't' },
      text: { type: 'string' },
      url: { type: 'string', short: 'u' },
      link: { type: 'string' },
      id: { type: 'string', short: 'i' },
      days: { type: 'string', short: 'd' },
      file: { type: 'string', short: 'f' },
      output: { type: 'string', short: 'o' },
      append: { type: 'boolean', short: 'a' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: false,
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Batch CLI JSON Converter
Converts text descriptions and links into validated Batch CLI test cases (Appendix B).

Usage:
  npm run create-case -- --jd "Job Description text..." --url "https://company.com" [options]

Options:
  --jd, --text, -t     Job description or role requirements text (Required if not using --file)
  --file, -f           Path to text file containing job description
  --url, --link, -u    Company or job posting URL
  --id, -i             Optional custom identifier for this case
  --days, -d           Available prep days (Default: 7)
  --output, -o         Output JSON file path (e.g., cases.json). If omitted, prints JSON to stdout
  --append, -a         Append to existing output JSON file instead of overwriting
  --help, -h           Show this help message

Examples:
  npm run create-case -- --url "https://stripe.com" --jd "Staff Engineer with Go and Raft experience" --output cases.json
  npm run create-case -- --file ./my-job.txt --url "https://uber.com" --days 5 --output cases.json
    `);
    process.exit(0);
  }

  // 1. Read JD text
  let jdText = (values.jd as string) || (values.text as string) || '';
  const filePath = values.file as string | undefined;

  if (filePath) {
    const resolvedFilePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedFilePath)) {
      console.error(`Error: File not found at ${resolvedFilePath}`);
      process.exit(1);
    }
    jdText = fs.readFileSync(resolvedFilePath, 'utf-8');
  }

  if (!jdText || !jdText.trim()) {
    console.error('Error: Job description text is required. Provide via --jd "..." or --file <path>');
    console.error('Run "npm run create-case -- --help" for detailed usage.');
    process.exit(1);
  }

  // 2. Read link & options
  const rawUrl = (values.url as string) || (values.link as string) || '';
  const daysNum = values.days ? parseInt(values.days as string, 10) : 7;
  const customId = (values.id as string) || undefined;

  // 3. Convert & validate
  let batchCase: BatchCase;
  try {
    batchCase = convertTextAndLinkToBatchCase({
      id: customId,
      jd: jdText.trim(),
      company_url: rawUrl,
      days: isNaN(daysNum) ? 7 : daysNum,
    });
  } catch (err: any) {
    console.error('Validation error:', err.message);
    process.exit(1);
  }

  const outputPath = values.output as string | undefined;
  const isAppend = Boolean(values.append);

  let allCases: BatchCase[] = [batchCase];

  if (outputPath) {
    const resolvedOutput = path.resolve(process.cwd(), outputPath);

    if (isAppend && fs.existsSync(resolvedOutput)) {
      try {
        const existingData = fs.readFileSync(resolvedOutput, 'utf-8');
        const parsed = JSON.parse(existingData);
        if (Array.isArray(parsed)) {
          allCases = [...parsed, batchCase];
        } else {
          allCases = [parsed, batchCase];
        }
      } catch (err: any) {
        console.warn(`Could not parse existing file ${resolvedOutput}, creating fresh file.`);
      }
    }

    const outputDir = path.dirname(resolvedOutput);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(resolvedOutput, JSON.stringify(allCases, null, 2), 'utf-8');
    console.log(`\n✓ Successfully saved ${allCases.length} case(s) to ${resolvedOutput}:`);
    console.log(`  Case ID: ${batchCase.id}`);
    console.log(`  Company URL: ${batchCase.company_url || '(none)'}`);
    console.log(`  Days: ${batchCase.days}`);
    console.log(`\nTo run this in the Batch CLI, execute:`);
    console.log(`  npm run evaluate -- --input ${outputPath} --output kits.json\n`);
  } else {
    // Print directly to stdout
    console.log(JSON.stringify(allCases, null, 2));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
