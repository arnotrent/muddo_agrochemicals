import { useEffect, useMemo, useState } from 'react'
import { distributorsApi } from '../../api/services'
import { COUNTRIES, REGION_LABEL, DISTRICT_LABEL, regionsOf, districtsOf } from '../../data/geo'
import { gmapsPlace } from '../../utils/geocode'
import LocationPicker from '../../components/LocationPicker'
import Icon from '../../components/Icon'

const EMPTY = { name: '', country: 'Uganda', region: '', district: '', town: '', address: '', location_details: '', phone: '', email: '', lat: NaN, lng: NaN }
const OTHER = '__other__'
const inputCls = 'w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue'

function Field({ label, children, hint, required }) {
  return (
    <div className="mb-3.5">
      <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}{required && ' *'}</label>
      {children}
      {hint && <div className="text-xs text-text-3 mt-1">{hint}</div>}
    </div>
  )
}

/** Dropdown when we have a list, with an "Other (type it)" escape hatch; plain text otherwise. */
function Cascade({ label, value, options, onChange, placeholder, required, disabled }) {
  const known = options.includes(value)
  const [custom, setCustom] = useState(!!value && !known)
  useEffect(() => { setCustom(!!value && !options.includes(value)) }, [options.join('|')]) // eslint-disable-line
  if (!options.length) {
    return <Field label={label} required={required}><input value={value} required={required} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} /></Field>
  }
  return (
    <Field label={label} required={required}>
      <select value={custom ? OTHER : value} disabled={disabled} required={required} onChange={(e) => { if (e.target.value === OTHER) { setCustom(true); onChange('') } else { setCustom(false); onChange(e.target.value) } }} className={inputCls}>
        <option value="">Select {label.toLowerCase()}…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER}>Other (type it)…</option>
      </select>
      {custom && <input autoFocus value={value} required={required} onChange={(e) => onChange(e.target.value)} placeholder={`Type the ${label.toLowerCase()}`} className={`${inputCls} mt-2`} />}
    </Field>
  )
}

export default function AdminDistributorsPage() {
  const [distributors, setDistributors] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState(null)
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [countryFilter, setCountryFilter] = useState('')

  const load = () => distributorsApi.list({ page_size: 300 }).then(({ data }) => setDistributors(data.results || data))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const regions = regionsOf(form.country)
  const districts = districtsOf(form.country, form.region)
  const hint = [form.town, form.district, form.region, form.country].filter(Boolean).join(', ')
  const hasPin = Number.isFinite(form.lat) && Number.isFinite(form.lng) && !(form.lat === 0 && form.lng === 0)

  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY) }
  const openNew = () => { setFlash(null); setEditing(null); setForm(EMPTY); setOpen(true) }

  const submit = async (e) => {
    e.preventDefault()
    setFlash(null)
    if (!hasPin) return setFlash({ ok: false, msg: 'Please set the outlet\u2019s exact spot on the map (click it, search a place, or enter coordinates).' })
    setSaving(true)
    const payload = { ...form }
    try {
      if (editing) await distributorsApi.update(editing, payload); else await distributorsApi.create(payload)
      setFlash({ ok: true, msg: editing ? 'Outlet updated.' : 'Outlet added.' })
      close(); load()
    } catch (err) {
      const errs = err.response?.data?.errors || {}
      setFlash({ ok: false, msg: errs.lat?.[0] || errs.non_field_errors?.[0] || Object.values(errs).flat()[0] || err.response?.data?.detail || 'Could not save outlet.' })
    } finally { setSaving(false) }
  }

  const startEdit = (d) => {
    setEditing(d.id); setFlash(null)
    setForm({ name: d.name, country: d.country, region: d.region, district: d.district, town: d.town || '', address: d.address || '', location_details: d.location_details || '', phone: d.phone || '', email: d.email || '', lat: d.lat, lng: d.lng })
    setOpen(true)
    setTimeout(() => document.getElementById('distributor-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const remove = async (d) => { if (!confirm(`Delete "${d.name}"?`)) return; await distributorsApi.remove(d.id); load() }

  const shown = useMemo(() => distributors.filter((d) => {
    const s = q.trim().toLowerCase()
    return (!countryFilter || d.country === countryFilter) && (!s || [d.name, d.district, d.region, d.town].some((x) => (x || '').toLowerCase().includes(s)))
  }), [distributors, q, countryFilter])

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-xl font-bold text-text-1 flex items-center gap-2"><Icon name="store" />Distributor Outlets</h1>
        {!open && <button onClick={openNew} className="px-4 py-2 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="plus-circle" />Add a distributor</button>}
      </div>

      {flash && <div role="status" className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${flash.ok ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}><Icon name={flash.ok ? 'check-circle' : 'exclamation-circle'} />{flash.msg}</div>}

      {open && (
        <form id="distributor-form" onSubmit={submit} className="bg-bg-card border border-border rounded-card mb-6 scroll-mt-20">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="font-bold text-text-1 flex items-center gap-2"><Icon name={editing ? 'edit' : 'plus-circle'} className="text-accent-blue" />{editing ? 'Edit outlet' : 'Add a distributor'}</div>
            <button type="button" onClick={close} aria-label="Close form" className="text-text-3"><Icon name="times" size="1.1rem" /></button>
          </div>
          <div className="p-5 grid lg:grid-cols-2 gap-x-8">
            <div>
              <Field label="Outlet name" required><input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></Field>
              <Field label="Country" required>
                <select value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, region: '', district: '' }))} className={inputCls}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
              <Cascade label={REGION_LABEL[form.country] || 'Region'} value={form.region} options={regions} required onChange={(v) => setForm((f) => ({ ...f, region: v, district: '' }))} placeholder="e.g. Central" />
              <Cascade label={DISTRICT_LABEL[form.country] || 'District'} value={form.district} options={districts} required disabled={!form.region} onChange={(v) => set('district', v)} placeholder={form.region ? 'e.g. Kampala' : 'Choose the region first'} />
              <Field label="City / town / trading centre" hint="Optional — the town or trading centre the shop is in."><input value={form.town} onChange={(e) => set('town', e.target.value)} placeholder="e.g. Katooke" className={inputCls} /></Field>
              <Field label="Street address"><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. Main Street, Plot 12" className={inputCls} /></Field>
              <Field label="Location description" hint="Optional — landmarks and directions customers will see, e.g. “Opposite Katooke market, next to the mosque.”">
                <textarea rows={3} maxLength={1000} value={form.location_details} onChange={(e) => set('location_details', e.target.value)} className={`${inputCls} resize-y`} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></Field>
                <Field label="Email"><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
              </div>
            </div>
            <div>
              <Field label="Exact location on the map" required hint="Search the town, then click the map or drag the pin onto the shop itself. The server checks the pin is inside the chosen country.">
                <LocationPicker lat={form.lat} lng={form.lng} country={form.country} hint={hint} onChange={(la, ln) => setForm((f) => ({ ...f, lat: la, lng: ln }))} />
              </Field>
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-2.5">
            <button disabled={saving} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"><Icon name="save" />{saving ? 'Saving…' : editing ? 'Save changes' : 'Add outlet'}</button>
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-btn bg-bg-alt text-text-2 font-bold text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-bg-card border border-border rounded-card">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3 justify-between">
          <div className="font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />All outlets ({shown.length})</div>
          <div className="flex gap-2 flex-wrap">
            <select aria-label="Filter by country" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm"><option value="">All countries</option>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search outlets…" aria-label="Search outlets" className="w-48 px-3 py-2 rounded-input border border-border bg-bg-input text-text-1 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Location</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Actions</th></tr></thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="p-3"><strong>{d.name}</strong></td>
                  <td className="p-3 text-text-3">{d.country} · {d.region} · {d.district}{d.town ? ` · ${d.town}` : ''}</td>
                  <td className="p-3 text-accent-blue">{d.phone || '—'}</td>
                  <td className="p-3"><div className="flex gap-1.5">
                    <a href={gmapsPlace(d.lat, d.lng)} target="_blank" rel="noreferrer" aria-label={`Open ${d.name} in Google Maps`} title="Open in Google Maps" className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="map-marker-alt" /></a>
                    <button onClick={() => startEdit(d)} aria-label={`Edit ${d.name}`} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name="edit" /></button>
                    <button onClick={() => remove(d)} aria-label={`Delete ${d.name}`} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button></div></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={4} className="text-center text-text-3 p-8">No outlets found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
