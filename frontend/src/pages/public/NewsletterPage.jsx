import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import Icon from '../../components/Icon'

/** /newsletter/confirm?token=…  (confirms automatically)   /newsletter/unsubscribe?token=…  (asks first, then unsubscribes) */
export default function NewsletterPage() {
  const { action } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState(action === 'confirm' && token ? 'working' : null)

  const run = async (path) => {
    setState('working')
    try { const { data } = await api.post(`/newsletter/${path}/`, { token }); setState({ ok: true, msg: data.message }) }
    catch (err) { setState({ ok: false, msg: err.response?.data?.detail || 'Something went wrong - please try again or contact us.' }) }
  }
  useEffect(() => { if (action === 'confirm' && token) run('confirm') }, []) // eslint-disable-line

  const valid = (action === 'confirm' || action === 'unsubscribe') && token
  return (
    <section className="py-20">
      <div className="max-w-[520px] mx-auto px-4 text-center bg-bg-card border border-border rounded-card p-8">
        <div className="w-14 h-14 rounded-full bg-bg-alt text-accent-blue flex items-center justify-center mx-auto mb-4"><Icon name="envelope" size="1.6rem" /></div>
        {!valid && <><h1 className="text-xl font-bold text-text-1 mb-2">This link is not valid</h1><p className="text-text-3 text-sm mb-5">Please use the link from your e-mail, or contact us.</p></>}
        {valid && state === 'working' && <p className="text-text-3">Please wait…</p>}
        {valid && state?.msg && (
          <><h1 className={`text-xl font-bold mb-2 ${state.ok ? 'text-accent-green' : 'text-accent-red'}`}>{state.ok ? 'Done' : 'Could not complete'}</h1><p className="text-text-2 text-sm mb-5" role="status">{state.msg}</p></>
        )}
        {valid && action === 'unsubscribe' && !state && (
          <><h1 className="text-xl font-bold text-text-1 mb-2">Unsubscribe from updates?</h1><p className="text-text-3 text-sm mb-5">You will stop receiving news and updates from Muddo Agro Chemicals LTD.</p>
            <button onClick={() => run('unsubscribe')} className="px-6 py-2.5 rounded-btn bg-accent-red text-white font-bold text-sm mb-3">Yes, unsubscribe me</button><br /></>
        )}
        <Link to="/" className="text-sm font-bold text-accent-blue">&larr; Back to the website</Link>
      </div>
    </section>
  )
}
