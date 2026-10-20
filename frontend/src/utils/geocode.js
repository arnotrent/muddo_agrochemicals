// OpenStreetMap Nominatim (free, no API key). Only called on an explicit user action
// (button/Enter), never on every keystroke, to respect the usage policy.
import { ISO } from '../data/geo'

const BASE = 'https://nominatim.openstreetmap.org'

export async function geocode(query, country) {
  const params = new URLSearchParams({ q: query, format: 'json', limit: '5', addressdetails: '1' })
  if (ISO[country]) params.set('countrycodes', ISO[country])
  const res = await fetch(`${BASE}/search?${params}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Search service unavailable')
  const rows = await res.json()
  return rows.map((r) => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name, box: r.boundingbox?.map(Number) }))
}

export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({ lat, lon: lng, format: 'json', zoom: '17', addressdetails: '1' })
  const res = await fetch(`${BASE}/reverse?${params}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Lookup unavailable')
  const r = await res.json()
  if (!r || r.error) return null
  return { label: r.display_name, countryCode: (r.address?.country_code || '').toLowerCase(), address: r.address }
}

export const gmapsPlace = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
export const gmapsDirections = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
export const gmapsEmbed = (lat, lng, z = 16) => `https://www.google.com/maps?q=${lat},${lng}&z=${z}&output=embed`
