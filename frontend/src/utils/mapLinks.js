// Links for "view the place" and "get directions". The saved coordinates are ALWAYS the primary target (they cannot be
// "not found"); the Google place id, when the admin picked a real Google place, only makes Google show the business name.
import { GOOGLE_KEY } from './googleMaps'

const ll = (d) => `${Number(d.lat)},${Number(d.lng)}`
export const hasCoords = (d) => Number.isFinite(Number(d?.lat)) && Number.isFinite(Number(d?.lng)) && !(Number(d.lat) === 0 && Number(d.lng) === 0)

export const placeUrl = (d) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll(d))}${d.place_id ? `&query_place_id=${encodeURIComponent(d.place_id)}` : ''}`

export const directionsUrl = (d) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll(d))}${d.place_id ? `&destination_place_id=${encodeURIComponent(d.place_id)}` : ''}&travelmode=driving`

export const embedUrl = (d, z = 16) => (GOOGLE_KEY
  ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_KEY)}&q=${encodeURIComponent(ll(d))}&zoom=${z}`
  : `https://maps.google.com/maps?q=${encodeURIComponent(ll(d))}&z=${z}&output=embed`)

export const osmUrl = (d, z = 17) => `https://www.openstreetmap.org/?mlat=${Number(d.lat)}&mlon=${Number(d.lng)}#map=${z}/${Number(d.lat)}/${Number(d.lng)}`
