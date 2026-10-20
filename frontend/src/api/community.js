import api from './client'

// Reviews of the website (testimonials) and of products — public submit, edit-your-own, plus the all-products feed.
export const communityApi = {
  recentProductReviews: () => api.get('/reviews/recent/'),
  editGet: (kind, token) => api.get(`/review-edit/${kind}/${token}/`),
  editSave: (kind, token, data) => api.patch(`/review-edit/${kind}/${token}/`, data),
  editDelete: (kind, token) => api.delete(`/review-edit/${kind}/${token}/`),
}
