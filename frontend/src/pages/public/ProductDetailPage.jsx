import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productsApi } from '../../api/services'
import Icon from '../../components/Icon'
import ProductCard from '../../components/ProductCard'
import site from '../../data/siteConfig'

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([productsApi.detail(id), productsApi.related(id)])
      .then(([p, r]) => {
        setProduct(p.data)
        setRelated(r.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="max-w-[1240px] mx-auto px-6 py-20 text-center text-text-3">Loading…</div>
  if (!product) return <div className="max-w-[1240px] mx-auto px-6 py-20 text-center text-text-3">Product not found.</div>

  const specs = [
    ['Active Ingredient', product.active_ingredient],
    ['Formulation', product.formulation],
    ['Target Crops', product.crops],
    ['Application Rate', product.dosage],
    ['Pack Sizes', product.packing],
    ['Category', product.category_display],
  ].filter(([, v]) => v)

  return (
    <section className="py-9">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="text-xs text-text-3 mb-4">
          <Link to="/" className="text-accent-blue">Home</Link> / <Link to={`/products/${product.category === 'other' ? 'other' : product.category + 's'}`} className="text-accent-blue">{product.category_display}</Link> / <span>{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.55fr] gap-12 items-start">
          <div>
            <div className="rounded-2xl overflow-hidden border border-border bg-bg-alt aspect-[4/3] sticky top-20">
              <img src={product.display_image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/images/products_all.jpg' }} />
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              <Link to={`/contact?subject=Product+Enquiry+${encodeURIComponent(product.name)}`} className="flex items-center justify-center gap-2 py-3.5 rounded-btn bg-accent-blue text-white font-bold text-sm">
                <Icon name="envelope" />Enquire Now
              </Link>
              <a href={`https://wa.me/${site.whatsapp_number || ''}?text=Hello%20MACL%2C%20I%20am%20interested%20in%20${encodeURIComponent(product.name)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3.5 rounded-btn bg-accent-green text-bg-deep font-bold text-sm">
                <Icon name="whatsapp" />WhatsApp Order
              </a>
              <div className="flex gap-2.5">
                <a href={productsApi.specSheetUrl(product.id)} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-btn border border-border text-text-2 text-sm font-bold">
                  <Icon name="file-pdf" />Spec Sheet
                </a>
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-btn border border-border text-text-2 text-sm font-bold">
                  <Icon name="print" />Print
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${
                product.stock_status === 'out' ? 'bg-accent-red' : product.stock_status === 'low' ? 'bg-accent-blue' : 'bg-accent-green'
              }`}>
                <Icon name={product.stock_status === 'out' ? 'times-circle' : product.stock_status === 'low' ? 'exclamation-circle' : 'check-circle'} />
                {product.stock_status === 'out' ? 'Out of Stock' : product.stock_status === 'low' ? 'Low Stock' : 'In Stock'}
              </span>
              <span className="text-xs text-text-3 bg-bg-alt px-3 py-1 rounded-full border border-border">MAAIF Registered</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-1 mb-3.5 leading-tight">{product.name}</h1>
            {product.description && (
              <p className="text-text-2 leading-relaxed mb-6 border-l-[3px] border-accent-blue pl-4">{product.description}</p>
            )}
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-3 mb-3 flex items-center gap-2">
              <Icon name="flask" className="text-accent-blue" />Technical Specifications
            </h3>
            <table className="w-full border-collapse rounded-xl overflow-hidden border border-border mb-5">
              <thead className="bg-bg-deep"><tr><th colSpan={2} className="p-3 text-left text-xs font-bold uppercase tracking-wide text-white/70">Product Technical Data</th></tr></thead>
              <tbody>
                {specs.map(([label, value]) => (
                  <tr key={label} className="border-b border-border">
                    <td className="p-3 bg-bg-alt text-xs font-bold text-text-3 w-[38%]">{label}</td>
                    <td className="p-3 text-sm text-text-1 font-semibold">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-l-4 border-accent-red bg-accent-red/[0.06] rounded-r-lg p-4 mb-4">
              <p className="text-sm text-text-2 leading-relaxed">
                <strong className="text-accent-red"><Icon name="exclamation-triangle" /> Safe Use:</strong> Always
                read the complete label before use. Wear gloves, goggles and protective clothing. Observe pre-harvest
                intervals. Keep away from children and food.
              </p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-bg-alt rounded-xl border border-border">
              <Icon name="certificate" className="text-accent-blue text-2xl flex-shrink-0" size="1.4rem" />
              <p className="text-sm text-text-2 leading-relaxed">
                All products distributed by MACL are registered with Uganda's Ministry of Agriculture, Animal
                Industry and Fisheries (MAAIF). Certificates available on request.
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-text-1 mb-7">More {product.category_display}s</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => <ProductCard key={r.id} product={r} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
