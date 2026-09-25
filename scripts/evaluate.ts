import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import dotenv from 'dotenv';
import { runPipelineForCase } from '../src/core/pipeline';
import { BatchCase, BatchOutputCase, BatchOutputPayload } from '../src/core/types';

// Load .env variables
dotenv.config();

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
    },
    strict: false,
    allowPositionals: true,
  });

  const inputPath = values.input as string | undefined;
  const outputPath = values.output as string | undefined;

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found at ${resolvedInput}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(resolvedInput, 'utf-8');
  let cases: BatchCase[] = [];

  try {
    const parsed = JSON.parse(rawData);
    cases = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err: any) {
    console.error(`Failed to parse input JSON: ${err.message}`);
    process.exit(1);
  }

  console.log(`[Batch Evaluator] Processing ${cases.length} case(s)...`);
  const results: BatchOutputCase[] = [];

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    const caseId = item.id || `case_${i + 1}`;
    console.log(`\n[Batch Evaluator] [${i + 1}/${cases.length}] Starting Case: ${caseId} (${item.company_url || 'no-url'})`);

    const days = item.days || 7;

    try {
      const kit = await runPipelineForCase(
        item.jd,
        item.company_url || '',
        days,
        (stage, percent, msg) => {
          console.log(`  -> [${stage}] ${percent}% - ${msg}`);
        }
      );

      results.push({
        id: caseId,
        status: 'ok',
        kit,
        error: null,
      });
      console.log(`[Batch Evaluator] Case ${caseId} SUCCESS. Questions: ${kit.questions.length}, Days: ${kit.schedule.days.length}`);
    } catch (err: any) {
      console.error(`[Batch Evaluator] Case ${caseId} FAILED:`, err.message);
      results.push({
        id: caseId,
        status: 'failed',
        kit: null,
        error: {
          code: err.code || err.type || 'GENERATION_ERROR',
          message: err.message || 'Failed to process case',
        },
      });
    }
  }

  const outputPayload: BatchOutputPayload = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutput, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`\n[Batch Evaluator] Evaluation complete! Saved ${results.length} kits to ${resolvedOutput}`);
}

main().catch((err) => {
  console.error('[Batch Evaluator] Uncaught fatal error:', err);
  process.exit(1);
});
