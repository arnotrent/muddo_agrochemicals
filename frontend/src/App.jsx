import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { RequireRole } from './routes/guards'

import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import PortalLayout from './layouts/PortalLayout'
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'

// Everything below is code-split: each page only downloads when the
// person actually navigates to it, instead of all being bundled into
// one large file the browser has to fetch before anything renders.
// HomePage and NotFoundPage stay eager since they're the two most
// likely first paints (direct landing, or a bad link).
const ProductCategoryPage = lazy(() => import('./pages/public/ProductCategoryPage'))
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'))
const ContactPage = lazy(() => import('./pages/public/ContactPage'))
const DistributorsPage = lazy(() => import('./pages/public/DistributorsPage'))
const AboutPage = lazy(() => import('./pages/public/AboutPage'))
const TrackPage = lazy(() => import('./pages/public/TrackPage'))
const SearchPage = lazy(() => import('./pages/public/SearchPage'))
const ComparePage = lazy(() => import('./pages/public/ComparePage'))
const LoginPage = lazy(() => import('./pages/public/LoginPage'))

const AgentDashboardPage = lazy(() => import('./pages/portal/AgentDashboardPage'))
const AgentChatPage = lazy(() => import('./pages/portal/AgentChatPage'))
const AgentProfilePage = lazy(() => import('./pages/portal/AgentProfilePage'))

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'))
const AdminInventoryPage = lazy(() => import('./pages/admin/AdminInventoryPage'))
const AdminDistributorsPage = lazy(() => import('./pages/admin/AdminDistributorsPage'))
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage'))
const AdminSupplyRequestsPage = lazy(() => import('./pages/admin/AdminSupplyRequestsPage'))
const AdminAgentsPage = lazy(() => import('./pages/admin/AdminAgentsPage'))
const AdminChatPage = lazy(() => import('./pages/admin/AdminChatPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminNewsletterPage = lazy(() => import('./pages/admin/AdminNewsletterPage'))
const AdminImportPage = lazy(() => import('./pages/admin/AdminImportPage'))

function RouteLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Public site */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:slug" element={<ProductCategoryPage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/distributors" element={<DistributorsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/track" element={<TrackPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Agent portal */}
              <Route element={<RequireRole role="agent" />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<AgentDashboardPage />} />
                  <Route path="/portal/chat" element={<AgentChatPage />} />
                  <Route path="/portal/profile" element={<AgentProfilePage />} />
                </Route>
              </Route>

              {/* Admin panel */}
              <Route element={<RequireRole role="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/products" element={<AdminProductsPage />} />
                  <Route path="/admin/inventory" element={<AdminInventoryPage />} />
                  <Route path="/admin/distributors" element={<AdminDistributorsPage />} />
                  <Route path="/admin/requests" element={<AdminRequestsPage />} />
                  <Route path="/admin/supply-requests" element={<AdminSupplyRequestsPage />} />
                  <Route path="/admin/agents" element={<AdminAgentsPage />} />
                  <Route path="/admin/chat" element={<AdminChatPage />} />
                  <Route path="/admin/newsletter" element={<AdminNewsletterPage />} />
                  <Route path="/admin/import" element={<AdminImportPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
