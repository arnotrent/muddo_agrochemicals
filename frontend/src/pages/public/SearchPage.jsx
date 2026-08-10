import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { coreApi } from '../../api/services'
import ProductCard from '../../components/ProductCard'
import Icon from '../../components/Icon'

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const [term, setTerm] = useState(q)
  const [results, setResults] = useState({ products: [], distributors: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q) return
    setLoading(true)
    coreApi.search(q).then(({ data }) => setResults(data)).finally(() => setLoading(false))
  }, [q])

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <>
      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-bold text-white my-3">Search Results</h1>
        </div>
      </section>
      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="max-w-[600px] mx-auto mb-10 flex gap-2.5">
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products, ingredients, crops…" autoFocus className="flex-1 px-3.5 py-3 rounded-input border border-border bg-bg-input text-text-1 outline-none focus:border-accent-blue" />
            <button type="submit" className="px-5 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm whitespace-nowrap flex items-center gap-2">
              <Icon name="search" />Search
            </button>
          </form>

          {q && !loading && (
            <>
              <p className="mb-7 text-text-3">
                Found <strong className="text-text-1">{results.products.length}</strong> product(s) and{' '}
                <strong className="text-text-1">{results.distributors.length}</strong> distributor(s) for{' '}
                <strong className="text-accent-blue">"{q}"</strong>
              </p>
              {results.products.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {results.products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
              {!results.products.length && !results.distributors.length && (
                <div className="text-center py-16">
                  <Icon name="search" size="3rem" className="text-border block mx-auto mb-4" />
                  <h3 className="font-bold text-text-1 mb-2">No results for "{q}"</h3>
                  <p className="text-text-3">Try different keywords — product name, active ingredient, or target crop.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
