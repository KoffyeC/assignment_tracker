import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.resolve(projectRoot, 'dist');

if (path.dirname(outputDirectory) !== projectRoot || path.basename(outputDirectory) !== 'dist') {
  throw new Error('Refusing to build outside the project dist directory.');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const directory of ['css', 'js']) {
  await cp(path.join(projectRoot, directory), path.join(outputDirectory, directory), {
    recursive: true,
  });
}

for (const entry of await readdir(projectRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    await cp(path.join(projectRoot, entry.name), path.join(outputDirectory, entry.name));
  }
}

console.log('Static Student Planner built in dist/.');
