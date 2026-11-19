import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDsl, validateStandardStreet } from '../src/parse-dsl.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = [
  ['custom/inc-item-data.cgi', '7a18185e98b32aee82ca1ce30d6f3c395157dbcb'],
  ['custom/inc-rebel-data.cgi', '923634e58a05beca9ab004515fc7669d53a1ba3a'],
];
const parsed = [];
const hashes = [];
for (const [name, expected] of sources) {
  const bytes = await readFile(path.join(repoRoot, name));
  const actual = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  hashes.push({ name, expected, actual, verified: actual === expected });
  parsed.push(parseDsl(new TextDecoder('utf-8', { fatal: true }).decode(bytes), name));
}
const report = { evidence: 'static source declarations only, not executable game behavior',
  hashes, ...validateStandardStreet(parsed) };
report.ok = report.ok && hashes.every(h => h.verified);
if (process.argv.includes('--write')) {
  const dest = path.join(repoRoot, 'modern/generated/definition-audit.json');
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, JSON.stringify({ ...report, blocks: parsed.flatMap(p => p.blocks) }, null, 2) + '\n');
  console.log('寫出報告：' + dest);
}
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
