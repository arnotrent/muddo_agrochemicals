import { useEffect, useState } from 'react'
import { coreApi } from '../../api/services'
import api from '../../api/client'
import Icon from '../../components/Icon'

export default function AdminSiteContentPage() {
  const [site, setSite] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' })
  const [flash, setFlash] = useState(null)

  const load = () => {
    coreApi.siteSettings().then(({ data }) => setSite(data))
    api.get('/faq/').then(({ data }) => setFaqs(data.results || data))
  }
  useEffect(() => { load() }, [])

  const handleSiteSave = async (e) => {
    e.preventDefault()
    await api.patch('/site-settings/', site)
    setFlash({ ok: true, msg: 'Site details updated.' })
  }

  const handleFaqAdd = async (e) => {
    e.preventDefault()
    await api.post('/admin/faq/', faqForm)
    setFaqForm({ question: '', answer: '' })
    load()
  }

  const handleFaqToggle = async (f) => {
    await api.patch(`/admin/faq/${f.id}/`, { active: !f.active })
    load()
  }

  const handleFaqDelete = async (f) => {
    if (!confirm(`Delete "${f.question}"?`)) return
    await api.delete(`/admin/faq/${f.id}/`)
    load()
  }

  if (!site) return null

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="edit" />Site Content</h1>

      {flash && <div className="mb-5 p-3.5 rounded-lg text-sm bg-accent-green/10 text-accent-green flex items-center gap-2"><Icon name="check-circle" />{flash.msg}</div>}

      <div className="bg-bg-card border border-border rounded-card mb-6">
        <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="building" className="text-accent-blue" />Company Info</div>
        <form onSubmit={handleSiteSave} className="p-5">
          <div className="grid sm:grid-cols-3 gap-3.5 mb-3.5">
            <F label="Year Founded" value={site.year_founded} onChange={(v) => setSite((s) => ({ ...s, year_founded: v }))} />
            <F label="Business Hours" value={site.business_hours} onChange={(v) => setSite((s) => ({ ...s, business_hours: v }))} />
            <F label="WhatsApp Number" value={site.whatsapp_number} onChange={(v) => setSite((s) => ({ ...s, whatsapp_number: v }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5 mb-3.5">
            <F label="Primary Phone" value={site.company_phone} onChange={(v) => setSite((s) => ({ ...s, company_phone: v }))} />
            <F label="Secondary Phone" value={site.company_phone_secondary} onChange={(v) => setSite((s) => ({ ...s, company_phone_secondary: v }))} />
          </div>
          <F label="Email" value={site.company_email} onChange={(v) => setSite((s) => ({ ...s, company_email: v }))} />
          <F label="Address" value={site.company_address} onChange={(v) => setSite((s) => ({ ...s, company_address: v }))} />
          <F label="Facebook Page URL" value={site.facebook_url} onChange={(v) => setSite((s) => ({ ...s, facebook_url: v }))} />
          <button className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 mt-2"><Icon name="save" />Save Company Info</button>
        </form>
      </div>

      <div className="bg-bg-card border border-border rounded-card mb-6">
        <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="plus-circle" className="text-accent-blue" />Add FAQ</div>
        <form onSubmit={handleFaqAdd} className="p-5">
          <F label="Question" value={faqForm.question} onChange={(v) => setFaqForm((f) => ({ ...f, question: v }))} required />
          <div className="mb-4">
            <label className="text-sm font-semibold text-text-2 block mb-1.5">Answer</label>
            <textarea required value={faqForm.answer} onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))} rows={3} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 resize-y" />
          </div>
          <button className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2"><Icon name="plus" />Add FAQ</button>
        </form>
      </div>

      <div className="bg-bg-card border border-border rounded-card">
        <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="question-circle" className="text-accent-blue" />Manage FAQs ({faqs.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">Question</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead>
            <tbody>
              {faqs.map((f) => (
                <tr key={f.id} className="border-b border-border">
                  <td className="p-3 max-w-[420px]"><strong>{f.question}</strong><div className="text-xs text-text-3 truncate">{f.answer}</div></td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${f.active ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-alt text-text-3'}`}>{f.active ? 'Visible' : 'Hidden'}</span></td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleFaqToggle(f)} className="px-2.5 py-1.5 rounded-lg bg-bg-alt text-text-2 text-xs"><Icon name={f.active ? 'eye-slash' : 'eye'} /></button>
                      <button onClick={() => handleFaqDelete(f)} className="px-2.5 py-1.5 rounded-lg border border-accent-red text-accent-red text-xs"><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!faqs.length && <tr><td colSpan={3} className="text-center text-text-3 p-8">No FAQs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function F({ label, value, onChange, required = false }) {
  return (
    <div className="mb-3.5">
      <label className="text-sm font-semibold text-text-2 block mb-1.5">{label}</label>
      <input value={value || ''} required={required} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
    </div>
  )
}
