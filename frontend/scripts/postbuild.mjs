// Deep-link fix for static hosts: a refresh on /products/pesticides asks the HOST for that path, which does not exist as
// a file. Hosts fall back to 404.html when it exists, so we publish a copy of index.html as 404.html (GitHub Pages,
// Cloudflare Pages, Render, S3 …). Netlify/Cloudflare also read public/_redirects; Vercel reads vercel.json.
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(join(dist, 'index.html'))) {
  copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))
  console.log('[postbuild] dist/404.html created (SPA fallback for page reloads)')
}
