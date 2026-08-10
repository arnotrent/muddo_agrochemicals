import { useEffect, useState } from 'react'
import { coreApi } from '../api/services'

let cache = null

export function useSiteSettings() {
  const [site, setSite] = useState(cache)

  useEffect(() => {
    if (cache) return
    coreApi
      .siteSettings()
      .then(({ data }) => {
        cache = data
        setSite(data)
      })
      .catch(() => {})
  }, [])

  return site
}
