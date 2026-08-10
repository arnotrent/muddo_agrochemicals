import { useEffect, useState } from 'react'
import api from '../../api/client'
import Icon from '../../components/Icon'

export default function AdminNewsletterPage() {
  const [subs, setSubs] = useState([])

  useEffect(() => {
    api.get('/admin/newsletter/').then(({ data }) => setSubs(data.results || data))
  }, [])

  const activeCount = subs.filter((s) => s.active).length

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="paper-plane" />Newsletter Subscribers</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-card p-4.5">
          <div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1">Total Subscribers</div>
          <div className="text-3xl font-bold text-text-1">{subs.length}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-card p-4.5">
          <div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1">Active</div>
          <div className="text-3xl font-bold text-accent-green">{activeCount}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-card p-4.5">
          <div className="text-xs font-bold uppercase tracking-wide text-text-3 mb-1">Unsubscribed</div>
          <div className="text-3xl font-bold text-text-3">{subs.length - activeCount}</div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-card">
        <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />All Subscribers</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-bg-alt text-xs text-text-3"><th className="p-3 text-left">#</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Subscribed</th></tr></thead>
            <tbody>
              {subs.map((s, i) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="p-3 text-text-3">{i + 1}</td>
                  <td className="p-3"><a href={`mailto:${s.email}`} className="text-accent-blue font-semibold">{s.email}</a></td>
                  <td className="p-3">{s.name || '\u2014'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.active ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-alt text-text-3'}`}>{s.active ? 'Active' : 'Unsubscribed'}</span></td>
                  <td className="p-3 text-text-3 text-xs">{new Date(s.subscribed_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!subs.length && <tr><td colSpan={5} className="text-center text-text-3 p-8">No subscribers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
