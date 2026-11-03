// Google Maps loader. Needs VITE_GOOGLE_MAPS_KEY at BUILD time (Maps JavaScript API + Places API (New) + Geocoding API enabled,
// key restricted to your website address). Without a key the admin falls back to the free OpenStreetMap picker.
export const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

let loading = null
if (typeof window !== 'undefined') {
  // Google calls this when the key is rejected (wrong key, API not enabled, referrer not allowed, billing off …)
  window.gm_authFailure = () => { loading = null; window.dispatchEvent(new Event('gmaps:authfail')) }
}

export function loadGoogleMaps() {
  if (!GOOGLE_KEY) return Promise.reject(new Error('no-key'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    window.__gmapsReady = () => resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&v=weekly&loading=async&callback=__gmapsReady&libraries=places`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('Google Maps could not be loaded (network or ad-blocker).')) }
    document.head.appendChild(s)
  })
  return loading
}
