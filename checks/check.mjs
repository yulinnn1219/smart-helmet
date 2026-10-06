import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const files = await readdir(new URL('dist/js/', root));
for (const file of files.filter((name) => name.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL('dist/js/' + file, root))], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}
const html = await readFile(new URL('dist/index.html', root), 'utf8');
for (const [, asset] of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) await readFile(new URL('dist/' + asset, root));
const css = await readFile(new URL('dist/styles.css', root), 'utf8');
if (/https?:\/\/|@import|url\(["']?https?/.test(css)) throw new Error('样式不能依赖外部网络资源');
console.log('JavaScript 语法、本地资源引用和样式离线依赖检查通过。');
