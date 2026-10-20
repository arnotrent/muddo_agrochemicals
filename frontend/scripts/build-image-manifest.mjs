// Lists images in public/images that NOTHING references yet, so the site can show them in galleries
// without touching (or duplicating) any image already in use. Runs automatically before dev/build.
// Optional captions: add  "file.jpg": "Your caption"  to src/data/imageCaptions.json.
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(frontend, '..')
const imgDir = join(frontend, 'public', 'images')
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i
const TEXT = /\.(jsx?|css|html|py|txt|md|json)$/i
const SKIP = new Set(['node_modules', 'dist', '.git', '__pycache__', 'private_media', 'media', 'staticfiles'])

const walk = (dir, test, out = []) => {
  if (!existsSync(dir)) return out
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue
    const p = join(dir, n)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, test, out)
    else if (test(n)) out.push(p)
  }
  return out
}

const manifestPath = join(frontend, 'src', 'data', 'imageManifest.json')
if (!existsSync(imgDir)) { console.log('[images] public/images not found — manifest left as is'); process.exit(0) }

const hasBackend = existsSync(join(repo, 'backend'))
const sources = [
  ...walk(join(frontend, 'src'), (n) => TEXT.test(n) && n !== 'imageManifest.json'),
  join(frontend, 'index.html'),
  ...(hasBackend ? walk(join(repo, 'backend'), (n) => /\.py$/.test(n)) : []),
  ...walk(join(repo, 'scripts'), (n) => TEXT.test(n)),
].filter(existsSync)
const haystack = sources.map((f) => readFileSync(f, 'utf8')).join('\n').toLowerCase()

const captionsFile = join(frontend, 'src', 'data', 'imageCaptions.json')
const captions = existsSync(captionsFile) ? JSON.parse(readFileSync(captionsFile, 'utf8') || '{}') : {}

function size(file) { // PNG / JPEG intrinsic size (no dependencies) so the page doesn't jump while loading
  try {
    const b = readFileSync(file)
    if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)]
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue }
        const m = b[i + 1]
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]
        i += 2 + b.readUInt16BE(i + 2)
      }
    }
  } catch { /* unreadable header */ }
  return [null, null]
}

const group = (f) => (/^product_/i.test(f) ? 'product' : /^field_/i.test(f) ? 'field' : /^(hero|banner)/i.test(f) ? 'banner' : 'misc')
const caption = (f) => captions[f] || f.replace(extname(f), '').replace(/^(product|field|hero|banner)[_-]/i, '').replace(/[_-]+/g, ' ').replace(/\b(\d{3,4}|v\d+|copy|final)\b/gi, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'MACL photo'

const images = readdirSync(imgDir).filter((f) => IMG.test(f)).sort().filter((f) => {
  if (haystack.includes(f.toLowerCase())) return false          // already used somewhere
  if (!hasBackend && /^product_/i.test(f)) return false          // seed data not visible → assume catalogue uses it
  if (/^(logo|favicon|products_all)/i.test(f)) return false
  return true
}).map((f) => { const [w, h] = size(join(imgDir, f)); return { file: f, src: `/images/${encodeURI(f)}`, group: group(f), caption: caption(f), w, h } })

writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), images }, null, 2) + '\n')
console.log(`[images] ${images.length} unused image(s) will be shown in galleries:`, images.map((i) => i.file).join(', ') || '—')
