import { useEffect, useState } from 'react'
import { productsApi } from '../../api/services'
import Modal from '../../components/Modal'
import ImageDropzone from '../../components/ImageDropzone'
import Icon from '../../components/Icon'

const CATEGORIES = [
  ['pesticide', 'Pesticide'], ['herbicide', 'Herbicide'], ['fungicide', 'Fungicide'], ['other', 'Other / Agri Input'],
]
const EMPTY_FORM = {
  name: '', category: 'pesticide', active_ingredient: '', formulation: '', crops: '', dosage: '',
  packing: '', description: '', usage_instructions: '', stock_qty: 0, reorder_level: 10, image_url: '', is_featured: false,
}
const inputCls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}</label>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  )
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | { id: number | null }
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [existingImage, setExistingImage] = useState(null)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => productsApi.list({ page_size: 500 }).then(({ data }) => setProducts(data.results || data))
  useEffect(() => { load() }, [])

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.active_ingredient || '').toLowerCase().includes(q)
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const close = () => { setModal(null); setForm(EMPTY_FORM); setImageFile(null); setExistingImage(null) }
  const openAdd = () => { setFlash(null); setForm(EMPTY_FORM); setImageFile(null); setExistingImage(null); setModal({ id: null }) }
  const openEdit = (p) => {
    setFlash(null)
    setForm({
      name: p.name, category: p.category, active_ingredient: p.active_ingredient || '', formulation: p.formulation || '',
      crops: p.crops || '', dosage: p.dosage || '', packing: p.packing || '', description: p.description || '',
      usage_instructions: p.usage_instructions || '', stock_qty: p.stock_qty || 0, reorder_level: 10, image_url: '', is_featured: !!p.is_featured,
    })
    setImageFile(null); setExistingImage(p.display_image || null); setModal({ id: p.id })
  }

  const buildFormData = (isEdit) => {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      // On edit never send what the form cannot know: the saved reorder level and a blank image link would
      // otherwise overwrite the real values every time a product is saved.
      if (isEdit && (k === 'reorder_level' || (k === 'image_url' && !v))) return
      fd.append(k, v ?? '')
    })
    if (imageFile) fd.append('image_file', imageFile)
    else if (isEdit && form.image_url) fd.append('image_file', '') // a pasted link replaces an uploaded file
    return fd
  }

  const save = async (e) => {
    e.preventDefault()
    const isEdit = !!modal.id
    setSaving(true); setFlash(null)
    try {
      if (isEdit) await productsApi.update(modal.id, buildFormData(true))
      else await productsApi.create(buildFormData(false))
      setFlash({ ok: true, msg: `"${form.name}" ${isEdit ? 'updated' : 'added'}!` })
      close(); load()
    } catch (err) {
      const errs = err.response?.data?.errors
      setFlash({ ok: false, msg: (errs && Object.values(errs).flat()[0]) || err.response?.data?.detail || 'Could not save the product.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return
    await productsApi.remove(p.id)
    setFlash({ ok: true, msg: `"${p.name}" deleted.` })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-xl font-bold text-text-1 flex items-center gap-2"><Icon name="flask" />Manage Products</h1>
        <button onClick={openAdd} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 transition-transform hover:-translate-y-0.5"><Icon name="plus-circle" />Add product</button>
      </div>

      {flash && (
        <div role="status" className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
          <Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-card">
        <div className="p-4 border-b border-border flex justify-between items-center gap-3">
          <div className="font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />All Products ({filtered.length})</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" aria-label="Search products" className="w-48 px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3"></th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Stock</th><th className="p-3 text-left">Actions</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="p-2"><img src={p.display_image} alt="" className="w-12 h-12 object-contain bg-bg-alt border border-border rounded-lg p-0.5" onError={(e) => { e.currentTarget.style.display = 'none' }} /></td>
                  <td className="p-3"><strong>{p.name}</strong></td>
                  <td className="p-3">{p.category_display}</td>
                  <td className="p-3">
                    {p.is_featured ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent-green/15 text-accent-green flex items-center gap-1 w-fit"><Icon name="star" size="0.7em" />Coming soon</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.stock_status === 'out' ? 'bg-accent-red/15 text-accent-red' : p.stock_status === 'low' ? 'bg-bg-alt text-accent-blue' : 'bg-accent-green/15 text-accent-green'}`}>
                        {p.stock_status === 'out' ? 'Out' : p.stock_qty}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="edit" /></button>
                      <button onClick={() => handleDelete(p)} aria-label={`Delete ${p.name}`} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={close} wide title={modal?.id ? 'Edit product' : 'Add a product'} icon={modal?.id ? 'edit' : 'plus-circle'}>
        <form onSubmit={save}>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field label="Product Name *" value={form.name} onChange={(v) => set('name', v)} required />
            <div>
              <label className="text-sm font-semibold text-text-2 block mb-1.5">Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <Field label="Active Ingredient" value={form.active_ingredient} onChange={(v) => set('active_ingredient', v)} />
            <Field label="Formulation" value={form.formulation} onChange={(v) => set('formulation', v)} />
            <Field label="Target Crops" value={form.crops} onChange={(v) => set('crops', v)} />
            <Field label="Dosage / Rate" value={form.dosage} onChange={(v) => set('dosage', v)} />
            <Field label="Pack Sizes" value={form.packing} onChange={(v) => set('packing', v)} />
            <Field label={modal?.id ? 'Stock Qty' : 'Initial Stock Qty'} type="number" value={form.stock_qty} onChange={(v) => set('stock_qty', v)} />
            {!modal?.id && <Field label="Reorder Level" type="number" value={form.reorder_level} onChange={(v) => set('reorder_level', v)} />}
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Product image</label>
            <ImageDropzone file={imageFile} onFile={setImageFile} existingUrl={existingImage} linkValue={form.image_url} onLink={(v) => set('image_url', v)} label="Add a product image" />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Description (short — shown on the product card)</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inputCls} resize-y`} />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Usage Instructions (one step per line — shown on the product detail page)</label>
            <textarea value={form.usage_instructions} onChange={(e) => set('usage_instructions', e.target.value)} rows={3} placeholder={'Mix 40ml in 20L of water.\nSpray evenly over the crop canopy.'} className={`${inputCls} resize-y`} />
          </div>
          <label className="mt-4 flex items-start gap-2.5 text-sm font-semibold text-text-2 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="w-4 h-4 mt-0.5" />
            <span>Featured — not yet in stock (shows “Coming Soon”, and is never counted as out of stock or low stock in the dashboard)</span>
          </label>
          <div className="flex gap-2.5 mt-6">
            <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="save" />{saving ? 'Saving…' : modal?.id ? 'Save changes' : 'Add product'}</button>
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
