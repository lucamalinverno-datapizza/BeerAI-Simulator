#!/usr/bin/env node
/**
 * Builds fallback/beerai-control-2d.html: a single self-contained HTML file (inline JS + CSS + fonts),
 * compiled from the SAME sources as the 3D app (engine, presets, store, panels). Opens from file://
 * without WebGL, server or network. No second engine is maintained by hand.
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'fallback');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/fallback/main.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020', 'safari15', 'chrome100'],
  jsx: 'automatic',
  write: false,
  outdir: 'fallback-out',
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'warning',
});

const js = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? '';
const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
if (/from\s*["']three["']|WebGLRenderer/.test(js)) {
  console.error('[fallback] three.js leaked into the 2D bundle — the fallback must not need WebGL.');
  process.exit(1);
}
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const safeCss = css.replace(/<\/style/gi, '<\\/style');
const stamp = new Date().toISOString();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="brewery-control-room-3d ${pkg.version} fallback build ${stamp}" />
<title>BeerAI — 2D Control Room (fallback)</title>
<style>${safeCss}</style>
</head>
<body>
<div id="root"></div>
<noscript>JavaScript is required to run the 2D control room.</noscript>
<script>${safeJs}</script>
</body>
</html>
`;
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'beerai-control-2d.html');
fs.writeFileSync(file, html);
console.log(`[fallback] wrote ${path.relative(root, file)} (${(html.length / 1024).toFixed(0)} KB, JS ${(js.length / 1024).toFixed(0)} KB)`);
