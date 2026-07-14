import { mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const outputDirectory = 'dist-back4app';

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ['src/cloud/index.js'],
  outfile: `${outputDirectory}/main.js`,
  bundle: true,
  external: ['parse/node'],
  format: 'cjs',
  logLevel: 'info',
  platform: 'node',
  target: 'node18',
});
