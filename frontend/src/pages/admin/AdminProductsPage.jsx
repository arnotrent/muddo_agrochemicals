import { useEffect, useState } from 'react'
import { productsApi } from '../../api/services'
import Icon from '../../components/Icon'

const CATEGORIES = [
  ['pesticide', 'Pesticide'], ['herbicide', 'Herbicide'], ['fungicide', 'Fungicide'], ['other', 'Other / Agri Input'],
]

const EMPTY_FORM = {
  name: '', category: 'pesticide', active_ingredient: '', formulation: '', crops: '', dosage: '',
  packing: '', description: '', usage_instructions: '', stock_qty: 0, reorder_level: 10, image_url: '', is_featured: false,
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addImageFile, setAddImageFile] = useState(null)
  const [editing, setEditing] = useState(null) // product id being edited, or null
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editImageFile, setEditImageFile] = useState(null)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => productsApi.list({ page_size: 500 }).then(({ data }) => setProducts(data.results || data))

  useEffect(() => { load() }, [])

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.active_ingredient || '').toLowerCase().includes(q)
  })

  const buildFormData = (form, imageFile) => {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
    if (imageFile) fd.append('image_file', imageFile)
    return fd
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFlash(null)
    try {
      await productsApi.create(buildFormData(addForm, addImageFile))
      setAddForm(EMPTY_FORM)
      setAddImageFile(null)
      setFlash({ ok: true, msg: `"${addForm.name}" added!` })
      load()
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.errors?.name?.[0] || err.response?.data?.detail || 'Could not add product.' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (p) => {
    setEditing(p.id)
    setEditForm({
      name: p.name, category: p.category, active_ingredient: p.active_ingredient || '',
      formulation: p.formulation || '', crops: p.crops || '', dosage: p.dosage || '',
      packing: p.packing || '', description: p.description || '', usage_instructions: p.usage_instructions || '',
      stock_qty: p.stock_qty || 0, reorder_level: 10, image_url: '', is_featured: !!p.is_featured,
    })
    setEditImageFile(null)
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await productsApi.update(editing, buildFormData(editForm, editImageFile))
      setFlash({ ok: true, msg: `"${editForm.name}" updated!` })
      setEditing(null)
      load()
    } catch (err) {
      setFlash({ ok: false, msg: err.response?.data?.detail || 'Could not save changes.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return
    await productsApi.remove(p.id)
    setFlash({ ok: true, msg: `"${p.name}" deleted.` })
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="flask" />Manage Products</h1>

      {flash && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-card mb-6">
        <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="plus-circle" className="text-accent-blue" />Add New Product</div>
        <form onSubmit={handleAdd} className="p-5">
          <div className="grid sm:grid-cols-3 gap-3.5">
            <Field label="Product Name *" value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} required />
            <div>
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Category *</label>
              <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <Field label="Active Ingredient" value={addForm.active_ingredient} onChange={(v) => setAddForm((f) => ({ ...f, active_ingredient: v }))} />
            <Field label="Formulation" value={addForm.formulation} onChange={(v) => setAddForm((f) => ({ ...f, formulation: v }))} />
            <Field label="Target Crops" value={addForm.crops} onChange={(v) => setAddForm((f) => ({ ...f, crops: v }))} />
            <Field label="Dosage / Rate" value={addForm.dosage} onChange={(v) => setAddForm((f) => ({ ...f, dosage: v }))} />
            <Field label="Pack Sizes" value={addForm.packing} onChange={(v) => setAddForm((f) => ({ ...f, packing: v }))} />
            <Field label="Initial Stock Qty" type="number" value={addForm.stock_qty} onChange={(v) => setAddForm((f) => ({ ...f, stock_qty: v }))} />
            <Field label="Reorder Level" type="number" value={addForm.reorder_level} onChange={(v) => setAddForm((f) => ({ ...f, reorder_level: v }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5 mt-3.5">
            <div>
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Product Image (upload)</label>
              <input type="file" accept="image/*" onChange={(e) => setAddImageFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            </div>
            <Field label="Or Image URL" value={addForm.image_url} onChange={(v) => setAddForm((f) => ({ ...f, image_url: v }))} placeholder="https://…" />
          </div>
          <div className="mt-3.5">
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Description (short — shown on the product card)</label>
            <textarea value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y" />
          </div>
          <div className="mt-3.5">
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Usage Instructions (one step per line — shown on the product detail page)</label>
            <textarea value={addForm.usage_instructions} onChange={(e) => setAddForm((f) => ({ ...f, usage_instructions: e.target.value }))} rows={3} placeholder={'Mix 40ml in 20L of water.\nSpray evenly over the crop canopy.'} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y" />
          </div>
          <label className="mt-3.5 flex items-center gap-2.5 text-sm font-semibold text-text-2 cursor-pointer">
            <input type="checkbox" checked={addForm.is_featured} onChange={(e) => setAddForm((f) => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4" />
            Featured — not yet in stock (shows a "Coming Soon" preview instead of stock status)
          </label>
          <button disabled={saving} className="mt-4 px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
            <Icon name="plus" />{saving ? 'Saving…' : 'Add Product'}
          </button>
        </form>
      </div>

      <div className="bg-bg-card border border-border rounded-card">
        <div className="p-4 border-b border-border flex justify-between items-center gap-3">
          <div className="font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />All Products ({filtered.length})</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-48 px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3"></th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Stock</th><th className="p-3 text-left">Actions</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="p-2"><img src={p.display_image} className="w-12 h-12 object-contain bg-bg-alt border border-border rounded-lg p-0.5" onError={(e) => { e.currentTarget.style.display = 'none' }} /></td>
                  <td className="p-3"><strong>{p.name}</strong></td>
                  <td className="p-3">{p.category_display}</td>
                  <td className="p-3">
                    {p.is_featured ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent-green/15 text-accent-green flex items-center gap-1 w-fit"><Icon name="star" size="0.7em" />Featured</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.stock_status === 'out' ? 'bg-accent-red/15 text-accent-red' : p.stock_status === 'low' ? 'bg-bg-alt text-accent-blue' : 'bg-accent-green/15 text-accent-green'}`}>
                        {p.stock_status === 'out' ? 'Out' : p.stock_qty}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(p)} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="edit" /></button>
                      <button onClick={() => handleDelete(p)} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/55 z-[4000] flex items-center justify-center p-5" onClick={() => setEditing(null)}>
          <div className="bg-bg-card rounded-2xl p-7 max-w-[640px] w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4.5">
              <h3 className="font-extrabold text-text-1 flex items-center gap-2"><Icon name="edit" className="text-accent-blue" />Edit Product</h3>
              <button onClick={() => setEditing(null)}><Icon name="times" /></button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <Field label="Product Name *" value={editForm.name} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} required />
                <div>
                  <label className="text-sm font-semibold text-text-2 block mb-1.5">Category *</label>
                  <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1">
                    {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <Field label="Active Ingredient" value={editForm.active_ingredient} onChange={(v) => setEditForm((f) => ({ ...f, active_ingredient: v }))} />
                <Field label="Formulation" value={editForm.formulation} onChange={(v) => setEditForm((f) => ({ ...f, formulation: v }))} />
                <Field label="Target Crops" value={editForm.crops} onChange={(v) => setEditForm((f) => ({ ...f, crops: v }))} />
                <Field label="Dosage / Rate" value={editForm.dosage} onChange={(v) => setEditForm((f) => ({ ...f, dosage: v }))} />
                <Field label="Pack Sizes" value={editForm.packing} onChange={(v) => setEditForm((f) => ({ ...f, packing: v }))} />
                <Field label="Stock Qty" type="number" value={editForm.stock_qty} onChange={(v) => setEditForm((f) => ({ ...f, stock_qty: v }))} />
              </div>
              <div className="mt-3.5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Description (short — shown on the product card)</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y" />
              </div>
              <div className="mt-3.5">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">Usage Instructions (one step per line)</label>
                <textarea value={editForm.usage_instructions} onChange={(e) => setEditForm((f) => ({ ...f, usage_instructions: e.target.value }))} rows={3} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3.5 mt-3.5">
                <div>
                  <label className="text-sm font-semibold text-text-2 block mb-1.5">Replace Image (upload)</label>
                  <input type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] || null)} className="w-full text-sm" />
                </div>
                <Field label="Or New Image URL" value={editForm.image_url} onChange={(v) => setEditForm((f) => ({ ...f, image_url: v }))} placeholder="Leave blank to keep current" />
              </div>
              <label className="mt-3.5 flex items-center gap-2.5 text-sm font-semibold text-text-2 cursor-pointer">
                <input type="checkbox" checked={editForm.is_featured} onChange={(e) => setEditForm((f) => ({ ...f, is_featured: e.target.checked }))} className="w-4 h-4" />
                Featured — not yet in stock (shows a "Coming Soon" preview instead of stock status)
              </label>
              <div className="flex gap-2.5 mt-5">
                <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="save" />Save Changes</button>
                <button type="button" onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm flex items-center gap-2"><Icon name="times" />Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}</label>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
    </div>
  )
}
