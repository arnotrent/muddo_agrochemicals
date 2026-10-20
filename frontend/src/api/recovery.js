import api from './client'

export const recoveryApi = {
  request: (identifier) => api.post('/auth/password-reset/request/', { identifier }),
  validate: (uid, token) => api.get('/auth/password-reset/validate/', { params: { uid, token } }),
  confirm: (data) => api.post('/auth/password-reset/confirm/', data),
  changeEmail: (email, password) => api.post('/auth/change-email/', { email, password }),
}
