import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Rectangle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { geocode, reverseGeocode } from '../utils/geocode'
import { detectArea, townOf } from '../utils/geoMatch'
import { COUNTRY_BOUNDS, toLeaflet, inCountry } from '../data/bounds'
import { ISO } from '../data/geo'
import Icon from './Icon'

const pin = new L.DivIcon({
  className: '',
  html: '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#38BDF8;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4)"></div>',
  iconSize: [30, 30], iconAnchor: [15, 30],
})

function Clicker({ onPick }) { useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) }); return null }
function Fly({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    if (target.box) map.flyToBounds([[target.box[0], target.box[2]], [target.box[1], target.box[3]]], { duration: 0.8, maxZoom: target.zoom || 15, padding: [20, 20] })
    else map.flyTo([target.lat, target.lng], target.zoom || 15, { duration: 0.8 })
  }, [target, map])
  return null
}
function Resize() { const map = useMap(); useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 250); return () => clearTimeout(t) }, [map]); return null }
// Locks panning to the chosen country so the admin cannot wander (or drop a pin) in another one.
function Lock({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) { map.setMaxBounds(L.latLngBounds(bounds).pad(0.05)); map.options.maxBoundsViscosity = 1 } else map.setMaxBounds(null)
    return () => map.setMaxBounds(null)
  }, [bounds, map])
  return null
}

const insideBox = (box, lat, lng, m = 0.03) => !box || (lat >= box[0] - m && lat <= box[1] + m && lng >= box[2] - m && lng <= box[3] + m)

/**
 * Distributor location picker.
 *  • Auto-zooms to the area described by town / district / region as they are chosen.
 *  • "Lock to area" (default on): pins outside the chosen COUNTRY are refused; pins outside the chosen
 *    DISTRICT are refused until the lock is switched off. The map cannot be panned out of the country.
 *  • Suggestions while typing (biased to the chosen district), with an ⚠ flag for places outside it.
 *  • After every pin it reverse-geocodes and warns when the spot is in another district/region/country,
 *    offering a one-tap "use detected area".
 *  • Picking a suggestion fills in region / district / town when they're still empty.
 */
export default function LocationPicker({ lat, lng, onChange, country, region, district, town, hint, onAreaDetected, onUseDetected }) {
  const has = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
  const [q, setQ] = useState('')
  const [sugs, setSugs] = useState([])
  const [sugOpen, setSugOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)       // refusal / info message
  const [fly, setFly] = useState(null)
  const [resolved, setResolved] = useState('')
  const [warn, setWarn] = useState(null)     // { text, detected }
  const [area, setArea] = useState(null)     // { box, label } of chosen district/town
  const [locked, setLocked] = useState(true)
  const seq = useRef(0)
  const sugAbort = useRef(null)

  const cb = COUNTRY_BOUNDS[country]
  const countryBounds = useMemo(() => (cb ? toLeaflet(cb) : null), [country]) // eslint-disable-line

  // ── 1. auto-zoom to the described area ─────────────────────────────
  useEffect(() => {
    const parts = [town, district, region].filter(Boolean)
    if (!parts.length) { setArea(null); if (cb) setFly({ box: [cb[0], cb[1], cb[2], cb[3]], zoom: 7, k: Date.now() }); return undefined }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const rows = await geocode([...parts, country].join(', '), country, { limit: 1, signal: ctrl.signal })
        const r = rows[0]
        if (!r) return setMsg({ kind: 'info', text: `Couldn't find “${parts.join(', ')}” on the map — search a nearby town or click the map.` })
        setMsg(null)
        setFly({ box: r.box, lat: r.lat, lng: r.lng, zoom: town ? 15 : 12, k: Date.now() })
        setArea(district || town ? { box: r.box, label: [town, district].filter(Boolean).join(', ') } : null)
      } catch (e) { if (e.name !== 'AbortError') { /* offline / rate-limited: map still usable manually */ } }
    }, 900)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [country, region, district, town]) // eslint-disable-line

  useEffect(() => { if (hint && !q) setQ(hint) }, [hint]) // eslint-disable-line

  // ── 2. check a spot, then accept it ────────────────────────────────
  const accept = (la, ln, zoom) => {
    const a = +la.toFixed(6), b = +ln.toFixed(6)
    onChange(a, b)
    if (zoom) setFly({ lat: a, lng: b, zoom, k: Date.now() })
  }
  const tryPlace = (la, ln, zoom) => {
    if (!inCountry(country, la, ln)) { setMsg({ kind: 'error', text: `That spot is outside ${country}. Pick a place inside ${country}, or change the country above.` }); return false }
    if (locked && area?.box && !insideBox(area.box, la, ln)) {
      setMsg({ kind: 'error', text: `That spot is outside ${area.label}. Move the pin inside it, change the district, or untick “Lock pin to the selected area”.` }); return false
    }
    setMsg(null); accept(la, ln, zoom); return true
  }

  // ── 3. what is under the pin? warn on mismatch ─────────────────────
  useEffect(() => {
    if (!has) { setResolved(''); setWarn(null); return undefined }
    const id = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await reverseGeocode(lat, lng)
        if (id !== seq.current) return
        if (!r) { setResolved('No named place found here — it may be over water or an unmapped area.'); return setWarn(null) }
        setResolved(r.label)
        const want = ISO[country]
        if (want && r.countryCode && r.countryCode !== want) return setWarn({ text: `This spot is in ${r.countryCode.toUpperCase()}, not ${country}.`, detected: null })
        const det = detectArea(country, r.label)
        if (district && det?.district && det.district !== district) {
          return setWarn({ text: `The pin is in ${det.district}${det.region ? ` (${det.region})` : ''}, but the form says ${district}.`, detected: { ...det, town: townOf(r.address) } })
        }
        if (!district && det) onAreaDetected?.({ ...det, town: townOf(r.address) })
        if (district && !det && !r.label.toLowerCase().includes(district.toLowerCase())) return setWarn({ text: `Couldn't confirm this spot is in ${district}. Double-check the pin.`, detected: null })
        setWarn(null)
      } catch { setResolved('') }
    }, 700)
    return () => clearTimeout(t)
  }, [lat, lng, country, district, has]) // eslint-disable-line

  // ── 4. autocomplete suggestions ────────────────────────────────────
  useEffect(() => {
    const term = q.trim()
    if (term.length < 3) { setSugs([]); return undefined }
    sugAbort.current?.abort()
    const ctrl = new AbortController(); sugAbort.current = ctrl
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const scope = [district, region].filter(Boolean).join(', ')
        const query = scope && !term.toLowerCase().includes(district.toLowerCase()) ? `${term}, ${scope}` : term
        let rows = area?.box && locked ? await geocode(query, country, { limit: 6, signal: ctrl.signal, box: [area.box[0], area.box[1], area.box[2], area.box[3]], bounded: true }) : []
        let outside = false
        if (!rows.length) { rows = await geocode(term, country, { limit: 6, signal: ctrl.signal }); outside = !!(area?.box && locked) }
        setSugs(rows.map((r) => ({ ...r, outside: outside && !insideBox(area.box, r.lat, r.lng) })))
        setActive(-1)
      } catch (e) { if (e.name !== 'AbortError') setSugs([]) } finally { setBusy(false) }
    }, 650)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, country, district, region, area, locked]) // eslint-disable-line

  const choose = (r) => {
    setSugOpen(false); setQ(r.label.split(',').slice(0, 3).join(','))
    if (tryPlace(r.lat, r.lng, 16)) {
      const det = detectArea(country, r.label)
      if (det) onAreaDetected?.({ ...det, town: townOf(r.address) })
    }
  }
  const onKey = (e) => {
    if (!sugOpen || !sugs.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % sugs.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? sugs.length - 1 : a - 1)) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(sugs[active]) }
    else if (e.key === 'Escape') setSugOpen(false)
  }
  const here = () => {
    if (!navigator.geolocation) return setMsg({ kind: 'error', text: 'Your device does not support location.' })
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { tryPlace(p.coords.latitude, p.coords.longitude, 17); setBusy(false) },
      () => { setMsg({ kind: 'error', text: 'Could not get your location (permission denied?).' }); setBusy(false) },
      { enableHighAccuracy: true, timeout: 10000 })
  }

  const center = useMemo(() => (has ? [lat, lng] : [1.3733, 32.2903]), []) // eslint-disable-line
  const inputCls = 'px-3 py-2 rounded-lg border border-border bg-bg-input text-text-1 text-sm outline-none focus:border-accent-blue'

  return (
    <div>
      <div className="relative mb-2">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <input value={q} onChange={(e) => { setQ(e.target.value); setSugOpen(true) }} onFocus={() => setSugOpen(true)} onKeyDown={onKey}
              role="combobox" aria-expanded={sugOpen && sugs.length > 0} aria-controls="loc-sugs" aria-autocomplete="list" aria-label="Search for a place"
              placeholder="Start typing a place, e.g. Katooke, Kakira, Jinja" className={`${inputCls} w-full`} />
            {busy && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" aria-label="Searching" />}
          </div>
          <button type="button" onClick={here} disabled={busy} className="px-3 py-2 rounded-lg bg-bg-alt text-text-2 text-sm font-bold flex items-center gap-1.5 disabled:opacity-60" title="Use this device's location"><Icon name="map-marker-alt" />My location</button>
        </div>
        {sugOpen && sugs.length > 0 && (
          <ul id="loc-sugs" role="listbox" className="absolute left-0 right-0 mt-1 border border-border rounded-lg divide-y divide-border bg-bg-card max-h-52 overflow-y-auto z-[1100] shadow-lg">
            {sugs.map((r, i) => (
              <li key={`${r.lat}${r.lng}${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(r)} className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-alt ${i === active ? 'bg-bg-alt' : ''} ${r.outside ? 'text-text-4' : 'text-text-2'}`}>
                  {r.outside && <span className="text-accent-red font-bold mr-1.5" title="Outside the selected area">⚠</span>}{r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-text-2 mb-2 cursor-pointer">
        <input type="checkbox" checked={locked} onChange={(e) => { setLocked(e.target.checked); setMsg(null) }} className="w-4 h-4" />
        Lock pin to the selected {area ? area.label : country} {area ? 'area' : ''}
      </label>
      {msg && <div role="status" className={`mb-2 text-xs flex gap-1.5 items-start ${msg.kind === 'error' ? 'text-accent-red' : 'text-text-3'}`}><Icon name={msg.kind === 'error' ? 'exclamation-circle' : 'info-circle'} className="mt-0.5" />{msg.text}</div>}

      <div className="h-[320px] rounded-xl overflow-hidden border border-border relative z-0">
        <MapContainer center={center} zoom={has ? 15 : 7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Clicker onPick={(a, b) => tryPlace(a, b)} />
          <Resize /><Fly target={fly} /><Lock bounds={countryBounds} />
          {area?.box && <Rectangle bounds={[[area.box[0], area.box[2]], [area.box[1], area.box[3]]]} pathOptions={{ color: '#38BDF8', weight: 2, dashArray: '6 6', fillOpacity: 0.05 }} interactive={false} />}
          {has && <Marker position={[lat, lng]} icon={pin} draggable eventHandlers={{
            dragend: (e) => { const p = e.target.getLatLng(); if (!tryPlace(p.lat, p.lng)) e.target.setLatLng([lat, lng]) },
          }} />}
        </MapContainer>
        {!has && <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none"><span className="px-3 py-1.5 rounded-full bg-bg-deep/85 text-white text-xs font-semibold">Click the map to drop the pin</span></div>}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-xs font-semibold text-text-3">Latitude
          <input type="number" step="any" value={has ? lat : ''} onChange={(e) => e.target.value !== '' && tryPlace(parseFloat(e.target.value), lng || 0)} className={`${inputCls} w-full mt-1`} /></label>
        <label className="text-xs font-semibold text-text-3">Longitude
          <input type="number" step="any" value={has ? lng : ''} onChange={(e) => e.target.value !== '' && tryPlace(lat || 0, parseFloat(e.target.value))} className={`${inputCls} w-full mt-1`} /></label>
      </div>

      {warn && (
        <div role="alert" className="mt-2.5 p-3 rounded-lg bg-accent-red/10 border border-accent-red/40 text-xs text-accent-red flex flex-wrap items-center gap-2">
          <Icon name="exclamation-triangle" /><span className="flex-1 min-w-[200px]">{warn.text}</span>
          {warn.detected && <button type="button" onClick={() => onUseDetected?.(warn.detected)} className="px-2.5 py-1 rounded-md bg-accent-red text-white font-bold">Use {warn.detected.district || warn.detected.region}</button>}
        </div>
      )}
      {resolved && !warn && <p className="mt-2 text-xs flex gap-1.5 items-start text-text-3"><Icon name="info-circle" className="mt-0.5" />{resolved}</p>}
    </div>
  )
}
