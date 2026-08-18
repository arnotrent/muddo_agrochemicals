import { Link } from 'react-router-dom'
import Icon from './Icon'

const CATEGORY_ICON = { pesticide: 'bug', herbicide: 'seedling', fungicide: 'microscope', other: 'boxes' }

export default function ProductCard({ product }) {
  const isFeatured = product.is_featured
  const stockBadge = isFeatured
    ? { text: 'Featured — Coming Soon', icon: 'star', cls: 'bg-accent-green/90' }
    : product.stock_status === 'out'
    ? { text: 'Out of Stock', icon: 'times-circle', cls: 'bg-accent-red/90' }
    : product.stock_status === 'low'
    ? { text: 'Low Stock', icon: 'exclamation-circle', cls: 'bg-accent-blue/90' }
    : { text: 'In Stock', icon: 'check-circle', cls: 'bg-accent-green/90' }

  return (
    <div className={`bg-bg-card border rounded-card overflow-hidden flex flex-col transition-all hover:-translate-y-1.5 hover:shadow-lg group ${isFeatured ? 'border-accent-green/50' : 'border-border hover:border-accent-blue'}`}>
      <div className="relative h-[210px] bg-bg-alt overflow-hidden">
        <img
          src={product.display_image}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = '/images/products_all.jpg' }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className={`absolute top-2.5 right-2.5 text-white text-[0.64rem] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full flex items-center gap-1 ${stockBadge.cls}`}>
          <Icon name={stockBadge.icon} size="0.7em" />{stockBadge.text}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <span className="inline-flex items-center gap-2 mb-2.5 text-[0.68rem] font-bold uppercase tracking-wide text-text-3">
          <Icon name={CATEGORY_ICON[product.category]} className="text-accent-blue" />
          {product.category_display}
        </span>
        <h3 className="font-bold text-text-1 mb-1.5 leading-snug">{product.name}</h3>
        <p className="text-sm text-text-3 leading-relaxed mb-3.5 line-clamp-2">{product.description}</p>
        <div className="flex gap-2 mt-auto pt-4 border-t border-border">
          <Link to={`/product/${product.id}`} className="flex-1 text-center py-2 rounded-btn bg-bg-alt text-text-2 text-sm font-bold hover:bg-bg-card hover:border hover:border-accent-blue">
            Details
          </Link>
          {isFeatured ? (
            <Link to={`/contact?subject=Product+Enquiry`} className="flex-1 text-center py-2 rounded-btn bg-accent-green text-bg-deep text-sm font-bold hover:bg-accent-green-hover">
              Notify Me
            </Link>
          ) : (
            <Link to={`/contact?subject=Product+Enquiry`} className="flex-1 text-center py-2 rounded-btn bg-accent-blue text-white text-sm font-bold shadow-glow-blue hover:bg-accent-blue-hover">
              Enquire
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
