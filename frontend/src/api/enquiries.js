import api from './client'

export const enquiriesApi = {
  adminList: (params) => api.get('/admin/contact-requests/', { params: { page_size: 300, ...params } }),
  adminSetStatus: (id, status) => api.patch(`/admin/contact-requests/${id}/`, { status }),
  adminReply: (id, data) => api.post(`/admin/contact-requests/${id}/reply/`, data),
  adminAssign: (id, data) => api.post(`/admin/contact-requests/${id}/assign/`, data),
  agentList: () => api.get('/agent/enquiries/'),
  agentReply: (id, data) => api.post(`/agent/enquiries/${id}/reply/`, data),
}
