import { build, context } from 'esbuild';
import { mkdir, cp, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const options = {
  entryPoints: ['src/scripts/index.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
};
if (process.argv.includes('--serve')) {
  const app = await context({ ...options, outfile: 'src/app.js', write: false });
  await app.watch();
  const { port } = await app.serve({ servedir: 'src', host: '127.0.0.1' });
  console.log('Sort Lab: http://127.0.0.1:' + port);
} else {
  await mkdir('dist', { recursive: true });
  await Promise.all([
    copyFile('src/index.html', 'dist/index.html'),
    cp('src/styles', 'dist/styles', { recursive: true }),
    cp('src/images', 'dist/images', { recursive: true }),
    build({ ...options, outfile: 'dist/app.js', minify: true }),
  ]);
  console.log('Built Sort Lab in dist/');
}
