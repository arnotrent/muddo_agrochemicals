import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { coreApi } from '../../api/services'
import Icon from '../../components/Icon'

export default function TrackPage() {
  const [params, setParams] = useSearchParams()
  const [ref, setRef] = useState(params.get('ref') || '')
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setParams({ ref })
    const { data } = await coreApi.trackEnquiry(ref)
    setResult(data.found ? data.result : null)
    setSearched(true)
  }

  return (
    <>
      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[620px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-bold text-white my-3">Track Your Enquiry</h1>
          <p className="text-white/85">Enter your reference number to check your enquiry status.</p>
        </div>
      </section>
      <section className="py-14">
        <div className="max-w-[620px] mx-auto px-4 sm:px-6">
          <div className="bg-bg-card border border-border rounded-card overflow-hidden">
            <div className="p-7 border-b border-border">
              <h3 className="font-bold text-text-1 mb-4.5">Enter Reference Number</h3>
              <form onSubmit={handleSubmit} className="flex gap-2.5">
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. ENQ-3A7X9K2M" className="flex-1 px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
                <button type="submit" className="px-5 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm whitespace-nowrap flex items-center gap-2">
                  <Icon name="search" />Track
                </button>
              </form>
            </div>
            {searched && result && (
              <div className="p-7">
                <div className="flex items-center gap-3.5 mb-6 p-4 rounded-xl bg-bg-alt">
                  <div className={`w-11.5 h-11.5 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${result.status === 'resolved' ? 'bg-accent-green text-bg-deep' : 'bg-accent-blue text-white'}`}>
                    <Icon name={result.status === 'resolved' ? 'check' : result.status === 'pending' ? 'clock' : 'envelope'} />
                  </div>
                  <div>
                    <div className="font-bold text-lg capitalize">Enquiry {result.status}</div>
                    <div className="text-xs text-text-3">Reference: <strong className="font-mono">{result.ref_number}</strong></div>
                  </div>
                </div>
                <table className="w-full border-collapse">
                  {[['Name', result.name], ['Email', result.email], ['Phone', result.phone || '—'], ['Subject', result.subject], ['Message', result.message]].map(([label, value]) => (
                    <tr key={label} className="border-b border-border">
                      <td className="py-2.5 px-1.5 text-xs font-bold text-text-3 w-[130px] align-top">{label}</td>
                      <td className="py-2.5 px-1.5 text-sm">{value}</td>
                    </tr>
                  ))}
                </table>
              </div>
            )}
            {searched && !result && (
              <div className="p-11 text-center">
                <Icon name="search" size="2.5rem" className="text-border block mx-auto mb-3.5" />
                <h4 className="font-bold text-text-1 mb-2">No enquiry found</h4>
                <p className="text-text-3 text-sm">Reference <strong className="font-mono">{ref}</strong> was not found. Please check and try again.</p>
              </div>
            )}
          </div>
          <div className="text-center mt-4">
            <Link to="/contact" className="text-sm text-accent-blue">&larr; Submit a new enquiry</Link>
          </div>
        </div>
      </section>
    </>
  )
}
