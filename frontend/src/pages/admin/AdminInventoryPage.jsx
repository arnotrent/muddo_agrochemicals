import { useEffect, useState } from 'react'
import { inventoryApi } from '../../api/services'
import Icon from '../../components/Icon'

export default function AdminInventoryPage() {
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [edits, setEdits] = useState({}) // { [productId]: { qty, action } }
  const [search, setSearch] = useState('')

  const load = () => {
    inventoryApi.list().then(({ data }) => setItems(data.results || data))
    inventoryApi.logs().then(({ data }) => setLogs(data.results || data))
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter((i) => {
    const q = search.toLowerCase()
    return !q || i.product_name.toLowerCase().includes(q) || i.product_category.includes(q)
  })

  const handleUpdate = async (productId) => {
    const edit = edits[productId] || {}
    const qty = parseInt(edit.qty, 10)
    if (isNaN(qty) || qty < 0) return
    await inventoryApi.update({ product_id: productId, action: edit.action || 'set', qty, reason: 'Admin update' })
    setEdits((e) => ({ ...e, [productId]: { qty: '', action: 'add' } }))
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="boxes" />Inventory Management</h1>

      <div className="bg-bg-card border border-border rounded-card mb-6">
        <div className="p-4 border-b border-border flex justify-between items-center gap-3">
          <div className="font-bold text-text-1 flex items-center gap-2"><Icon name="boxes" className="text-accent-blue" />Stock Levels</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-48 px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Product</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Stock</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Update</th></tr></thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-border">
                  <td className="p-3"><strong>{i.product_name}</strong></td>
                  <td className="p-3 text-text-3">{i.product_category}</td>
                  <td className="p-3 font-bold text-lg">{i.stock_qty}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${i.status === 'out' ? 'bg-accent-red/15 text-accent-red' : i.status === 'low' ? 'bg-bg-alt text-accent-blue' : 'bg-accent-green/15 text-accent-green'}`}>
                      {i.status === 'out' ? 'Out of Stock' : i.status === 'low' ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1.5 items-center">
                      <input type="number" min="0" placeholder="Qty" value={edits[i.product]?.qty || ''} onChange={(e) => setEdits((ed) => ({ ...ed, [i.product]: { ...ed[i.product], qty: e.target.value } }))} className="w-16 px-2 py-1.5 rounded-lg border border-border bg-bg-input text-sm" />
                      <select value={edits[i.product]?.action || 'add'} onChange={(e) => setEdits((ed) => ({ ...ed, [i.product]: { ...ed[i.product], action: e.target.value } }))} className="px-2 py-1.5 rounded-lg border border-border bg-bg-input text-sm">
                        <option value="add">Add</option><option value="remove">Remove</option><option value="set">Set To</option>
                      </select>
                      <button onClick={() => handleUpdate(i.product)} className="px-2.5 py-1.5 rounded-lg bg-accent-blue text-white text-xs"><Icon name="check" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No inventory records.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="history" className="text-accent-blue" />Recent Activity</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Product</th><th className="p-3 text-left">Change</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">By</th><th className="p-3 text-left">Date</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border">
                    <td className="p-3">{l.product_name}</td>
                    <td className="p-3"><strong className={l.change_qty >= 0 ? 'text-accent-green' : 'text-accent-red'}>{l.change_qty >= 0 ? '+' : ''}{l.change_qty}</strong></td>
                    <td className="p-3 text-text-3">{l.reason || '—'}</td>
                    <td className="p-3 text-text-3">{l.changed_by || 'system'}</td>
                    <td className="p-3 text-text-3 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
