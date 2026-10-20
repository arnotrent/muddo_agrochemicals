import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { geocode, reverseGeocode } from '../utils/geocode'
import { ISO } from '../data/geo'
import Icon from './Icon'

const pin = new L.DivIcon({
  className: '',
  html: '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#38BDF8;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4)"></div>',
  iconSize: [30, 30], iconAnchor: [15, 30],
})

function Clicker({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}
function Fly({ target }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], target.zoom || 15, { duration: 0.8 }) }, [target, map])
  return null
}
// Leaflet measures its container once; when the form panel opens (display change) it needs a nudge.
function Resize() {
  const map = useMap()
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 250); return () => clearTimeout(t) }, [map])
  return null
}

/**
 * Click the map (or drag the pin) to set the exact spot. Search a place name, use the device's
 * location, or type coordinates. Warns when the pin resolves to a different country.
 * `hint` pre-fills the search box from the country/region/district the admin already chose.
 */
export default function LocationPicker({ lat, lng, onChange, country, hint }) {
  const has = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [fly, setFly] = useState(null)
  const [resolved, setResolved] = useState('')
  const seq = useRef(0)

  useEffect(() => { if (hint && !q) setQ(hint) }, [hint]) // eslint-disable-line

  const set = (la, ln, zoom) => {
    const a = +la.toFixed(6), b = +ln.toFixed(6)
    onChange(a, b)
    if (zoom) setFly({ lat: a, lng: b, zoom, k: Date.now() })
  }

  // Look up what's under the pin (debounced) so the admin can see it landed in the right town/country.
  useEffect(() => {
    if (!has) { setResolved(''); return }
    const id = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await reverseGeocode(lat, lng)
        if (id !== seq.current) return
        if (!r) return setResolved('No named place found here — it may be over water or an unmapped area.')
        const want = ISO[country]
        setResolved(want && r.countryCode && r.countryCode !== want ? `⚠ This spot is in ${r.countryCode.toUpperCase()}, not ${country}. ${r.label}` : r.label)
      } catch { setResolved('') }
    }, 700)
    return () => clearTimeout(t)
  }, [lat, lng, country, has])

  const search = async (e) => {
    e?.preventDefault()
    if (!q.trim()) return
    setBusy(true); setMsg(null)
    try {
      const rows = await geocode(q.trim(), country)
      setResults(rows)
      if (!rows.length) setMsg('No match — try a nearby town, or click the map directly.')
      else if (rows.length === 1) { set(rows[0].lat, rows[0].lng, 16); setResults([]) }
    } catch { setMsg('Place search is unavailable right now — click the map instead.') } finally { setBusy(false) }
  }

  const here = () => {
    if (!navigator.geolocation) return setMsg('Your device does not support location.')
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { set(p.coords.latitude, p.coords.longitude, 17); setBusy(false) },
      () => { setMsg('Could not get your location (permission denied?).'); setBusy(false) },
      { enableHighAccuracy: true, timeout: 10000 })
  }

  const center = useMemo(() => (has ? [lat, lng] : [1.3733, 32.2903]), []) // eslint-disable-line
  const inputCls = 'px-3 py-2 rounded-lg border border-border bg-bg-input text-text-1 text-sm outline-none focus:border-accent-blue'

  return (
    <div>
      <form onSubmit={search} className="flex gap-2 mb-2 flex-wrap">
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search for a place" placeholder="Search a place, e.g. Katooke, Kakira, Jinja" className={`${inputCls} flex-1 min-w-[200px]`} />
        <button disabled={busy} className="px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60"><Icon name="search" />Find</button>
        <button type="button" onClick={here} disabled={busy} className="px-3 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-bold flex items-center gap-1.5 disabled:opacity-60" title="Use this device's location"><Icon name="map-marker-alt" />My location</button>
      </form>
      {results.length > 1 && (
        <ul className="mb-2 border border-border rounded-lg divide-y divide-border bg-bg-card max-h-40 overflow-y-auto" role="listbox" aria-label="Search results">
          {results.map((r, i) => <li key={i}><button type="button" onClick={() => { set(r.lat, r.lng, 16); setResults([]) }} className="w-full text-left px-3 py-2 text-sm text-text-2 hover:bg-bg-alt">{r.label}</button></li>)}
        </ul>
      )}
      {msg && <div role="status" className="mb-2 text-xs text-accent-red">{msg}</div>}

      <div className="h-[320px] rounded-xl overflow-hidden border border-border relative z-0">
        <MapContainer center={center} zoom={has ? 15 : 7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Clicker onPick={(a, b) => set(a, b)} />
          <Resize /><Fly target={fly} />
          {has && <Marker position={[lat, lng]} icon={pin} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); set(p.lat, p.lng) } }} />}
        </MapContainer>
        {!has && <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none"><span className="px-3 py-1.5 rounded-full bg-bg-deep/85 text-white text-xs font-semibold">Click the map to drop the pin</span></div>}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-xs font-semibold text-text-3">Latitude
          <input type="number" step="any" value={has ? lat : ''} onChange={(e) => e.target.value !== '' && onChange(parseFloat(e.target.value), lng || 0)} className={`${inputCls} w-full mt-1`} /></label>
        <label className="text-xs font-semibold text-text-3">Longitude
          <input type="number" step="any" value={has ? lng : ''} onChange={(e) => e.target.value !== '' && onChange(lat || 0, parseFloat(e.target.value))} className={`${inputCls} w-full mt-1`} /></label>
      </div>
      {resolved && <p className={`mt-2 text-xs flex gap-1.5 items-start ${resolved.startsWith('⚠') ? 'text-accent-red' : 'text-text-3'}`}><Icon name="info-circle" className="mt-0.5" />{resolved}</p>}
    </div>
  )
}
