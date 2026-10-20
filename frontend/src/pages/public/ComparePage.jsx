import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../../api/services'
import Icon from '../../components/Icon'

const ROWS = [
  ['Category', (p) => p.category_display],
  ['Active Ingredient', (p) => p.active_ingredient || '—'],
  ['Target Crops', (p) => p.crops || '—'],
  ['Pack Sizes', (p) => p.packing || '—'],
  ['Stock', (p) => p.stock_status === 'in' ? 'In Stock' : p.stock_status === 'low' ? 'Low Stock' : 'Out of Stock'],
]

export default function ComparePage() {
  const [all, setAll] = useState([])
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])

  useEffect(() => {
    productsApi.list({ page_size: 200 }).then(({ data }) => setAll(data.results || data))
  }, [])

  const filtered = all.filter((p) => (!category || p.category === category) && (!query || p.name.toLowerCase().includes(query.toLowerCase())))

  const toggle = (p) => {
    setSelected((sel) => {
      if (sel.find((s) => s.id === p.id)) return sel.filter((s) => s.id !== p.id)
      if (sel.length >= 3) return sel
      return [...sel, p]
    })
  }

  return (
    <>
      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-bold text-white my-3">Compare Products</h1>
          <p className="text-white/85 max-w-[52ch]">Select up to 3 products to compare their specifications side by side.</p>
        </div>
      </section>
      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="bg-bg-card border border-border rounded-card p-6.5 mb-8">
            <h3 className="font-bold text-text-1 mb-4 flex items-center gap-2"><Icon name="plus-circle" className="text-accent-blue" />Select Products to Compare</h3>
            <div className="flex gap-3 flex-wrap items-end mb-4">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44 px-3 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                <option value="">All Categories</option>
                <option value="pesticide">Pesticides</option>
                <option value="herbicide">Herbicides</option>
                <option value="fungicide">Fungicides</option>
                <option value="other">Other Products</option>
              </select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type product name…" className="flex-1 min-w-[200px] px-3 py-2.5 rounded-input border border-border bg-bg-input text-text-1" />
              <div className="text-sm font-bold text-text-3 bg-bg-alt px-3.5 py-2 rounded-lg whitespace-nowrap">{selected.length} / 3 selected</div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
              {filtered.map((p) => {
                const isSel = selected.find((s) => s.id === p.id)
                return (
                  <div key={p.id} onClick={() => toggle(p)} className={`p-2.5 border-[1.5px] rounded-xl cursor-pointer text-center transition-colors ${isSel ? 'border-accent-blue bg-bg-alt' : 'border-border bg-bg-card'}`}>
                    <img src={p.display_image} className="w-full h-12 object-cover rounded-md mb-1.5" onError={(e) => { e.currentTarget.src = '/images/products_all.jpg' }} />
                    <div className="text-[0.7rem] font-bold text-text-1 leading-tight">{p.name}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {selected.length > 0 ? (
            <div className="rounded-2xl border border-border overflow-x-auto">
              <table className="w-full border-collapse min-w-[500px]">
                <thead style={{ background: '#0F172A' }}>
                  <tr>
                    <th className="p-4 text-left text-[0.74rem] font-bold uppercase tracking-wide text-white/50 w-[150px]">Attribute</th>
                    {selected.map((p) => (
                      <th key={p.id} className="p-3.5 text-center text-white border-l border-white/10">
                        <img src={p.display_image} className="w-14 h-14 object-cover rounded-lg mx-auto mb-2" onError={(e) => { e.currentTarget.src = '/images/products_all.jpg' }} />
                        <div className="text-sm font-bold leading-tight">{p.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([label, fn], i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-bg-card' : 'bg-bg-alt'}>
                      <td className="p-3 text-sm font-bold text-text-3 border-r border-border">{label}</td>
                      {selected.map((p) => <td key={p.id} className="p-3 text-sm text-center border-r border-border">{fn(p)}</td>)}
                    </tr>
                  ))}
                  <tr className="bg-bg-alt">
                    <td className="p-3 text-xs font-bold uppercase text-text-3 border-r border-border">Actions</td>
                    {selected.map((p) => (
                      <td key={p.id} className="p-2.5 text-center border-r border-border">
                        <Link to={`/product/${p.id}`} className="block px-2.5 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-bold mb-1">Details</Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-14 text-text-3">
              <Icon name="balance-scale" size="3.5rem" className="block mx-auto mb-4 opacity-60" />
              <h3 className="font-bold text-text-1">Select products to compare</h3>
              <p>Click any product card above to add it.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
