import api from './client'

// Two-factor authentication + the admin actions that require a code.
export const securityApi = {
  status: () => api.get('/admin/2fa/status/'),
  setup: (password) => api.post('/admin/2fa/setup/', { password }),
  enable: (code) => api.post('/admin/2fa/enable/', { code }),
  disable: (password, otp) => api.post('/admin/2fa/disable/', { password, otp }),
  backupCodes: (password, otp) => api.post('/admin/2fa/backup-codes/', { password, otp }),
  changePassword: (data) => api.post('/admin/account/change-password/', data),
  resetAgentPassword: (data) => api.post('/admin/agents/reset-password/', data),
}

export const secError = (err, fallback) => err.response?.data?.detail || (err.response?.status === 429 ? 'Too many attempts - wait a minute and try again.' : fallback)
