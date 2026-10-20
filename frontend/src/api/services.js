import api from './client'

// ── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => api.post('/auth/login/', { username, password }),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
}

// ── Products ─────────────────────────────────────────────────────
export const productsApi = {
  list: (params) => api.get('/products/', { params }),
  detail: (id) => api.get(`/products/${id}/`),
  related: (id) => api.get(`/products/${id}/related/`),
  specSheetUrl: (id) => `${api.defaults.baseURL}/products/${id}/spec-sheet/`,
  create: (formData) => api.post('/products/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.patch(`/products/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/products/${id}/`),
}

// ── Distributors ─────────────────────────────────────────────────
export const distributorsApi = {
  list: (params) => api.get('/distributors/', { params }),
  create: (data) => api.post('/distributors/', data),
  update: (id, data) => api.patch(`/distributors/${id}/`, data),
  remove: (id) => api.delete(`/distributors/${id}/`),
}

// ── Core (contact, newsletter, FAQ, site settings, search) ────────
export const coreApi = {
  contact: (data) => api.post('/contact/', data),
  trackEnquiry: (ref) => api.get('/contact/track/', { params: { ref } }),
  subscribe: (email, name = '') => api.post('/newsletter/subscribe/', { email, name }),
  faqs: () => api.get('/faq/'),
  siteSettings: () => api.get('/site-settings/'),
  search: (q) => api.get('/search/', { params: { q } }),
  myStaffProfile: () => api.get('/me/staff-profile/'),
  updateMyStaffProfile: (formData) =>
    api.patch('/me/staff-profile/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// ── Agents ───────────────────────────────────────────────────────
export const agentsApi = {
  me: () => api.get('/agents/me/'),
  updateMe: (formData) => api.patch('/agents/me/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  status: () => api.get('/agents/status/'),
  adminList: () => api.get('/admin/agents/'),
  adminCreate: (data) => api.post('/admin/agents/', data),
  adminDelete: (id) => api.delete(`/admin/agents/${id}/`),
  adminToggle: (id) => api.post(`/admin/agents/${id}/toggle/`),
  reportPdfUrl: (id) => `${api.defaults.baseURL}/admin/agents/${id}/report/`,
}

// ── Supply requests ──────────────────────────────────────────────
export const supplyRequestsApi = {
  mine: () => api.get('/supply-requests/'),
  create: (data) => api.post('/supply-requests/', data),
  adminList: (params) => api.get('/admin/supply-requests/', { params }),
  adminRespond: (id, data) => api.post(`/admin/supply-requests/${id}/respond/`, data),
}

// ── Messaging ────────────────────────────────────────────────────
export const messagingApi = {
  list: (params) => api.get('/messages/', { params }),
  send: (formData) => api.post('/messages/send/', formData,
    formData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  unread: () => api.get('/messages/unread/'),
  markRead: (data) => api.post('/messages/mark-read/', data),
  adminContacts: () => api.get('/admin/chat/contacts/'),
  agentContacts: () => api.get('/agent/chat/contacts/'),
}

// ── Inventory ────────────────────────────────────────────────────
export const inventoryApi = {
  list: () => api.get('/inventory/'),
  logs: () => api.get('/inventory/logs/'),
  update: (data) => api.post('/inventory/update/', data),
}

// ── Analytics / admin dashboard ─────────────────────────────────
export const analyticsApi = {
  dashboard: () => api.get('/admin/dashboard/'),
  charts: () => api.get('/admin/dashboard/charts/'),
  importCsv: (formData) => api.post('/admin/products/import-csv/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data) => api.post('/admin/account/change-password/', data),
  resetAgentPassword: (data) => api.post('/admin/agents/reset-password/', data),
  sysinfo: () => api.get('/admin/sysinfo/'),
}

export default api
