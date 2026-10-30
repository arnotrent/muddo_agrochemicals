/** One readable message from an API error: the first field error, else the server's detail, else the fallback. */
export function errText(err, fallback = 'Something went wrong.') {
  if (!err?.response) return `${fallback} (no connection to the server)`
  const d = err.response.data
  const errs = d?.errors
  const first = errs && typeof errs === 'object' ? Object.values(errs).flat()[0] : null
  const msg = (typeof first === 'string' ? first : first?.message) || d?.detail
  const code = err.response.status
  return `${msg || fallback}${code >= 500 ? ` (server error ${code})` : ''}`
}
