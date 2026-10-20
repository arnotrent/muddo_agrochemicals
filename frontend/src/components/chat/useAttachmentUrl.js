import { useCallback, useState } from 'react'
import { messagingApi } from '../../api/services'

/** Signed links expire after an hour; on a load error we quietly ask for a fresh one. */
export function useAttachmentUrl(att) {
  const [url, setUrl] = useState(att.url)
  const [tried, setTried] = useState(false)
  const refresh = useCallback(async () => {
    if (tried || att.legacy) return
    setTried(true)
    try { const { data } = await messagingApi.link(att.id); setUrl(data.url) } catch { /* keep */ }
  }, [att.id, att.legacy, tried])
  return [url, refresh]
}

export async function freshUrl(att) {
  if (att.legacy || att.pending) return att.url
  try { const { data } = await messagingApi.link(att.id); return data.url } catch { return att.url }
}

export async function downloadAttachment(att) {
  const url = await freshUrl(att)
  if (!url) return
  const a = document.createElement('a')
  a.href = att.legacy ? url : `${url}${url.includes('?') ? '&' : '?'}dl=1`
  a.download = att.name
  a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}
