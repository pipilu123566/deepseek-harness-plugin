import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['web/app.js'], bundle: true, format: 'esm', target: ['safari16', 'chrome110'], outfile: 'dist/app.js', minify: true, legalComments: 'linked' });
await Promise.all(['index.html', 'style.css', 'sign-in.html'].map(file => copyFile(`web/${file}`, `dist/${file}`)));
