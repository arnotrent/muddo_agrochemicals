// Fails the build with a CLEAR message when App.jsx imports a page/file that is not in the project
// (e.g. a page that was deleted but is still routed), instead of a cryptic bundler error.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const app = readFileSync(join(src, 'App.jsx'), 'utf8')
const rels = [...app.matchAll(/(?:import\(|from\s+)['"](\.[^'"]+)['"]/g)].map((m) => m[1])
const missing = rels.filter((r) => !['', '.jsx', '.js', '/index.jsx', '/index.js'].some((e) => existsSync(join(src, r + e))))
if (missing.length) {
  console.error('\n[routes] App.jsx imports file(s) that do not exist:\n  ' + missing.join('\n  ') + '\nDelete the matching <Route>/import from src/App.jsx, or restore the file.\n')
  process.exit(1)
}
console.log(`[routes] all ${rels.length} App.jsx imports resolve`)
