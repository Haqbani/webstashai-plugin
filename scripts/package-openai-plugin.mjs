#!/usr/bin/env node
// Compatibility entrypoint for the canonical package README; reuse this repo's validator.
import { validatePlugin, packagePlugin } from './package-plugin.mjs';
try {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--check','--require-submission'].includes(arg))) throw new Error('Usage: node scripts/package-openai-plugin.mjs [--check] [--require-submission]');
  const options = { requireSubmission: args.includes('--require-submission') };
  console.log(JSON.stringify(args.includes('--check') ? validatePlugin(options) : packagePlugin(options),null,2));
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}
