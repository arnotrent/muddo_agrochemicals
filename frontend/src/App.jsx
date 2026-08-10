import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { RequireRole } from './routes/guards'

import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import PortalLayout from './layouts/PortalLayout'

import HomePage from './pages/public/HomePage'
import ProductCategoryPage from './pages/public/ProductCategoryPage'
import ProductDetailPage from './pages/public/ProductDetailPage'
import ContactPage from './pages/public/ContactPage'
import DistributorsPage from './pages/public/DistributorsPage'
import AboutPage from './pages/public/AboutPage'
import TrackPage from './pages/public/TrackPage'
import SearchPage from './pages/public/SearchPage'
import ComparePage from './pages/public/ComparePage'
import LoginPage from './pages/public/LoginPage'
import NotFoundPage from './pages/public/NotFoundPage'

import AgentDashboardPage from './pages/portal/AgentDashboardPage'
import AgentChatPage from './pages/portal/AgentChatPage'
import AgentProfilePage from './pages/portal/AgentProfilePage'

import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminDistributorsPage from './pages/admin/AdminDistributorsPage'
import AdminRequestsPage from './pages/admin/AdminRequestsPage'
import AdminSupplyRequestsPage from './pages/admin/AdminSupplyRequestsPage'
import AdminAgentsPage from './pages/admin/AdminAgentsPage'
import AdminChatPage from './pages/admin/AdminChatPage'
import AdminSiteContentPage from './pages/admin/AdminSiteContentPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminNewsletterPage from './pages/admin/AdminNewsletterPage'
import AdminImportPage from './pages/admin/AdminImportPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
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
                <Route path="/admin/site-content" element={<AdminSiteContentPage />} />
                <Route path="/admin/newsletter" element={<AdminNewsletterPage />} />
                <Route path="/admin/import" element={<AdminImportPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
