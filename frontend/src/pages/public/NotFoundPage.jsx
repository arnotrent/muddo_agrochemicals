import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'

export default function NotFoundPage() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center text-center px-5">
      <div>
        <div className="text-8xl font-extrabold text-accent-blue mb-2">404</div>
        <h1 className="text-2xl font-bold text-text-1 mb-3">Page Not Found</h1>
        <p className="text-text-3 max-w-[40ch] mx-auto mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-accent-blue text-white font-bold text-sm"><Icon name="home" />Go Home</Link>
          <Link to="/products/pesticides" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn border border-border text-text-2 font-bold text-sm"><Icon name="flask" />Browse Products</Link>
          <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-3 rounded-btn border border-border text-text-2 font-bold text-sm"><Icon name="envelope" />Contact Us</Link>
        </div>
      </div>
    </section>
  )
}
