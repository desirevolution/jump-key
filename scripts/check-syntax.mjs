import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function* javascriptFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) yield* javascriptFiles(file);
    else if (entry.isFile() && /\.[cm]?js$/.test(entry.name)) yield file;
  }
}

let checked = 0;
for (const root of ['src', 'tests', 'scripts']) {
  for await (const file of javascriptFiles(root)) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
    checked++;
  }
}
const config = spawnSync(process.execPath, ['--check', 'vite.config.js'], { stdio: 'inherit' });
if (config.status !== 0) process.exit(config.status || 1);
console.log(`Syntax check passed (${checked + 1} JS files).`);
