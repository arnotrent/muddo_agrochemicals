// Post-build step for static hosts.
//  * Cloudflare Pages: SPA fallback is AUTOMATIC when the build has NO 404.html. A 404.html (or a catch-all _redirects
//    rule) switches that off / triggers loop warnings, so on Cloudflare we remove both and let Pages serve index.html.
//  * Everywhere else (GitHub Pages, Render static, S3 ...): publish index.html as 404.html so deep links survive a reload.
import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const onCloudflare = Boolean(process.env.CF_PAGES || process.env.CF_PAGES_BRANCH || process.env.CLOUDFLARE_PAGES)

if (existsSync(join(dist, 'index.html'))) {
  if (onCloudflare) {
    rmSync(join(dist, '404.html'), { force: true })
    rmSync(join(dist, '_redirects'), { force: true })
    console.log('[postbuild] Cloudflare Pages detected - using its automatic SPA fallback (no 404.html / _redirects)')
  } else {
    copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))
    console.log('[postbuild] dist/404.html created (SPA fallback for page reloads)')
  }
}
