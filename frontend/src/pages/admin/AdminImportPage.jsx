import { useState } from 'react'
import { analyticsApi } from '../../api/services'
import Icon from '../../components/Icon'

export default function AdminImportPage() {
  const [file, setFile] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const formData = new FormData()
      formData.append('csv_file', file)
      const { data } = await analyticsApi.importCsv(formData)
      setResults(data)
      setFile(null)
      e.target.reset()
    } catch (err) {
      setError(err.response?.data?.detail || 'Import failed \u2014 please check the file and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text-1 mb-6 flex items-center gap-2"><Icon name="upload" />Import Products via CSV</h1>

      {results && (
        <div className={`mb-5 p-3.5 rounded-lg text-sm flex items-center gap-2 ${results.errors?.length ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-green/10 text-accent-green'}`}>
          <Icon name={results.errors?.length ? 'exclamation-circle' : 'check-circle'} />
          Import complete \u2014 <strong className="mx-1">{results.added}</strong> added,{' '}
          <strong className="mx-1">{results.skipped}</strong> skipped
          {results.errors?.length > 0 && <>, <strong className="mx-1">{results.errors.length}</strong> error(s)</>}.
        </div>
      )}
      {error && (
        <div className="mb-5 p-3.5 rounded-lg text-sm bg-accent-red/10 text-accent-red flex items-center gap-2">
          <Icon name="exclamation-circle" />{error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="upload" className="text-accent-blue" />Upload CSV File</div>
          <div className="p-5">
            <p className="text-sm text-text-3 mb-5">Upload a CSV file with product data. Existing products with the same name will be skipped.</p>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="text-sm font-semibold text-text-2 block mb-1.5">CSV File *</label>
                <input type="file" accept=".csv" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
              </div>
              <button disabled={loading || !file} className="px-5 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                <Icon name="upload" />{loading ? 'Importing\u2026' : 'Import Now'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-card">
          <div className="p-4 border-b border-border font-bold text-text-1 flex items-center gap-2"><Icon name="list" className="text-accent-blue" />CSV Format Guide</div>
          <div className="p-5">
            <p className="text-sm text-text-3 mb-3">First row must have these headers:</p>
            <div className="bg-bg-alt rounded-lg p-3.5 font-mono text-xs text-text-2 border border-border overflow-x-auto whitespace-nowrap">
              name, category, description, active_ingredient, formulation, crops, dosage, packing, image_url
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-text-3 mb-2">Valid <code>category</code> values:</p>
              <div className="flex gap-1.5 flex-wrap">
                {['pesticide', 'herbicide', 'fungicide', 'other'].map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-xs font-bold bg-bg-alt text-accent-blue">{c}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 p-3 bg-bg-alt rounded-lg text-sm text-text-2 flex items-start gap-1.5">
              <Icon name="info-circle" className="text-accent-blue mt-0.5" />Only <code>name</code> and <code>category</code> are required.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
