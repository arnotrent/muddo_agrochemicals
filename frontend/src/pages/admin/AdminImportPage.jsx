import { useState } from 'react'
import api from '../../api/client'
import Icon from '../../components/Icon'

const cell = (v) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // stops spreadsheet formula injection when the file is opened in Excel
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const download = (name, rows) => {
  const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

const KINDS = {
  products: {
    label: 'Products', icon: 'flask', url: '/admin/products/import-csv/', limit: 'up to 1,000 rows',
    required: 'name, category',
    columns: ['name', 'category', 'description', 'usage_instructions', 'active_ingredient', 'formulation', 'crops', 'dosage', 'packing', 'image_url', 'stock_qty', 'reorder_level', 'is_featured'],
    example: ['MD EXAMPLE 50EC', 'pesticide', 'Short description', 'Mix 40ml in 20L | Spray evenly', 'Example 500 g/l', 'Emulsifiable Concentrate (EC)', 'Maize, Beans', '40ml per 20L', '100ml, 1L', '', '50', '10', 'no'],
    notes: 'category: pesticide, herbicide, fungicide or other. Separate usage steps with " | ". Existing product names are skipped, never overwritten.',
  },
  agents: {
    label: 'Field agents', icon: 'users', url: '/admin/agents/import-csv/', limit: 'up to 50 rows per file',
    required: 'name, username',
    columns: ['name', 'username', 'email', 'phone', 'region', 'district', 'password'],
    example: ['Jane Nakato', 'jane.nakato', 'jane@example.com', '+256 700 000000', 'Central', 'Wakiso', ''],
    notes: 'region: Central, Eastern, Northern or Western. Leave password empty and a strong one is generated for you (shown once after the import - download it then).',
  },
  distributors: {
    label: 'Distributors', icon: 'store', url: '/admin/distributors/import-csv/', limit: 'up to 500 rows',
    required: 'name, region, district, latitude, longitude',
    columns: ['name', 'country', 'region', 'district', 'town', 'address', 'location_details', 'phone', 'email', 'latitude', 'longitude'],
    example: ['Example Agro Shop', 'Uganda', 'Eastern', 'Jinja', 'Jinja Town', 'Main Street, Plot 4', 'Opposite the market', '+256 700 000000', '', '0.4244', '33.2041'],
    notes: 'Every outlet needs its exact map position (copy latitude / longitude from Google Maps: right-click the spot). Pins outside the chosen country are rejected. Country defaults to Uganda.',
  },
}
const BADGE = { created: 'bg-accent-green/15 text-accent-green', skipped: 'bg-bg-alt text-text-3', failed: 'bg-accent-red/15 text-accent-red' }

export default function AdminImportPage() {
  const [kind, setKind] = useState('products')
  const [file, setFile] = useState(null)
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const k = KINDS[kind]

  const pick = (key) => { setKind(key); setFile(null); setRes(null); setError('') }
  const submit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true); setError(''); setRes(null)
    try {
      const fd = new FormData(); fd.append('csv_file', file)
      const { data } = await api.post(k.url, fd, { timeout: 150000 })
      setRes(data); setFile(null); e.target.reset()
    } catch (err) {
      const d = err.response?.data
      const first = d?.errors && Object.values(d.errors).flat()[0]
      setError((typeof first === 'string' && first) || d?.detail || (err.response ? `Import failed (${err.response.status}).` : 'No connection to the server - please try again.'))
    } finally { setLoading(false) }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-5 flex items-center gap-2"><Icon name="upload" />Bulk Import</h1>
      <div className="flex gap-2 flex-wrap mb-6" role="tablist">
        {Object.entries(KINDS).map(([key, v]) => (
          <button key={key} role="tab" aria-selected={kind === key} onClick={() => pick(key)} className={`px-4 py-2 rounded-btn text-sm font-bold flex items-center gap-2 ${kind === key ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}><Icon name={v.icon} />{v.label}</button>
        ))}
      </div>

      {error && <div role="alert" className="mb-5 p-3.5 rounded-lg text-sm bg-accent-red/10 text-accent-red flex items-center gap-2"><Icon name="exclamation-circle" />{error}</div>}
      {res && (
        <div role="status" className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 flex-wrap ${res.failed ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-green/10 text-accent-green'}`}>
          <Icon name={res.failed ? 'exclamation-circle' : 'check-circle'} />Import finished - <strong>{res.created}</strong> added, <strong>{res.skipped}</strong> skipped, <strong>{res.failed}</strong> failed (of {res.total} rows).
        </div>
      )}

      {res?.credentials?.length > 0 && (
        <div className="mb-5 p-4 rounded-card border border-accent-blue/50 bg-accent-blue/5">
          <div className="font-bold text-text-1 mb-1 flex items-center gap-2"><Icon name="key" className="text-accent-blue" />Generated passwords - shown only now</div>
          <p className="text-sm text-text-2 mb-3">Download this list and hand each agent their login. It is not stored anywhere readable and cannot be shown again; you can reset any password later in Settings.</p>
          <button onClick={() => download('agent-logins.csv', [['name', 'username', 'password'], ...res.credentials.map((c) => [c.name, c.username, c.password])])} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="save" />Download logins (CSV)</button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="upload" className="text-accent-blue" />Upload {k.label.toLowerCase()} CSV</div>
          <form onSubmit={submit} className="p-5">
            <p className="text-sm text-text-3 mb-4">Excel: <em>File → Save As → CSV (UTF-8)</em>. Max 2 MB, {k.limit}. Every row is checked separately - a bad row never blocks the good ones.</p>
            <input type="file" accept=".csv,text/csv" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm mb-4" aria-label="CSV file" />
            <div className="flex gap-2.5 flex-wrap">
              <button disabled={loading || !file} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="upload" />{loading ? 'Importing…' : 'Import now'}</button>
              <button type="button" onClick={() => download(`${kind}-template.csv`, [k.columns, k.example])} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm flex items-center gap-2"><Icon name="file-pdf" />Download template</button>
            </div>
          </form>
        </div>
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />Column guide</div>
          <div className="p-5 text-sm">
            <p className="text-text-3 mb-2">First row = these headers (order does not matter):</p>
            <div className="bg-bg-alt rounded-lg p-3 font-mono text-xs text-text-2 border border-border overflow-x-auto whitespace-nowrap mb-3">{k.columns.join(', ')}</div>
            <p className="text-text-2 mb-2"><strong>Required:</strong> {k.required}</p>
            <p className="text-text-3">{k.notes}</p>
          </div>
        </div>
      </div>

      {res?.rows?.length > 0 && (
        <div className="bg-bg-card border border-border rounded-card overflow-x-auto">
          <div className="p-4 border-b border-border font-bold text-text-1">Rows that were not added</div>
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Row</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Result</th><th className="p-3 text-left">Why</th></tr></thead>
            <tbody>{res.rows.map((r) => (
              <tr key={`${r.row}-${r.status}`} className="border-b border-border"><td className="p-3 text-text-3">{r.row}</td><td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${BADGE[r.status]}`}>{r.status}</span></td><td className="p-3 text-text-2">{r.message}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
