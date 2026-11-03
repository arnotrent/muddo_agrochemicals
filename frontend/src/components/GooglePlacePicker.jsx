import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../utils/googleMaps'
import Icon from './Icon'

const UGANDA = { lat: 1.3733, lng: 32.2903 }
const norm = (comps = []) => comps.map((c) => ({ long: c.long_name ?? c.longText, short: c.short_name ?? c.shortText, types: c.types || [] }))
const PLACE_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents']

/**
 * Google Maps picker for the admin: search any business / address (Google Places), or click / drag the pin.
 * Every pick reports { lat, lng, placeId, address, components, name, source } — the form fills in the grid references,
 * country, region, district and town automatically. `source` is 'search' (a real Google place) or 'pin' (clicked/dragged).
 */
export default function GooglePlacePicker({ lat, lng, onPick, onFail }) {
  const mapEl = useRef(null)
  const searchEl = useRef(null)
  const api = useRef({})
  const cb = useRef({ onPick, onFail })
  cb.current = { onPick, onFail }
  const [state, setState] = useState('loading') // loading | ready | error
  const [errMsg, setErrMsg] = useState('')
  const [latTxt, setLatTxt] = useState('')
  const [lngTxt, setLngTxt] = useState('')
  const has = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)

  useEffect(() => {
    let dead = false
    const fail = (m) => { if (!dead) { setState('error'); setErrMsg(m); cb.current.onFail?.(m) } }
    const onAuth = () => fail('Google rejected the Maps key (wrong key, an API not enabled, billing off, or this website address is not allowed for the key).')
    window.addEventListener('gmaps:authfail', onAuth)
    ;(async () => {
      try {
        const maps = await loadGoogleMaps()
        const { Map } = await maps.importLibrary('maps')
        const { Geocoder } = await maps.importLibrary('geocoding')
        const { PlaceAutocompleteElement } = await maps.importLibrary('places')
        await maps.importLibrary('marker')
        if (dead) return
        const start = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
        const map = new Map(mapEl.current, { center: start ? { lat, lng } : UGANDA, zoom: start ? 17 : 7, mapTypeControl: true, streetViewControl: true, fullscreenControl: true, gestureHandling: 'greedy' })
        const geocoder = new Geocoder()
        const marker = new maps.Marker({ map: start ? map : null, position: start ? { lat, lng } : UGANDA, draggable: true })
        const reverse = (la, ln) => geocoder.geocode({ location: { lat: la, lng: ln } })
          .then(({ results }) => { const r = results?.[0]; return r ? { address: r.formatted_address, components: norm(r.address_components) } : {} })
          .catch(() => ({}))
        const settle = async (la, ln, zoomTo) => {
          marker.setMap(map); marker.setPosition({ lat: la, lng: ln })
          if (zoomTo) { map.setCenter({ lat: la, lng: ln }); map.setZoom(zoomTo) }
          const info = await reverse(la, ln)
          cb.current.onPick({ lat: +la.toFixed(6), lng: +ln.toFixed(6), placeId: '', source: 'pin', ...info })
        }
        api.current = { map, marker, settle }
        map.addListener('click', (e) => settle(e.latLng.lat(), e.latLng.lng()))
        marker.addListener('dragend', () => { const p = marker.getPosition(); settle(p.lat(), p.lng()) })

        const pac = new PlaceAutocompleteElement({})
        pac.style.width = '100%'; pac.style.colorScheme = 'light'
        searchEl.current?.replaceChildren(pac)
        const choose = async (place) => {
          try {
            await place.fetchFields({ fields: PLACE_FIELDS })
            const la = place.location.lat(); const ln = place.location.lng()
            marker.setMap(map); marker.setPosition({ lat: la, lng: ln }); map.setCenter({ lat: la, lng: ln }); map.setZoom(17)
            cb.current.onPick({
              lat: +la.toFixed(6), lng: +ln.toFixed(6), placeId: place.id || '', name: place.displayName || '',
              address: place.formattedAddress || '', components: norm(place.addressComponents), source: 'search',
            })
          } catch { setErrMsg('Could not read that place from Google — try another result or click the map.') }
        }
        pac.addEventListener('gmp-select', ({ placePrediction }) => choose(placePrediction.toPlace()))
        pac.addEventListener('gmp-placeselect', ({ place }) => choose(place)) // older API versions
        setState('ready')
      } catch (e) { fail(e.message || 'Google Maps could not start.') }
    })()
    return () => { dead = true; window.removeEventListener('gmaps:authfail', onAuth) }
  }, []) // eslint-disable-line

  // keep the marker + the coordinate boxes in step with the form (editing an outlet, typed coordinates …)
  useEffect(() => {
    setLatTxt(has ? String(lat) : ''); setLngTxt(has ? String(lng) : '')
    const { map, marker } = api.current
    if (!map) return
    if (!has) { marker.setMap(null); return }
    const p = marker.getPosition()
    if (!p || Math.abs(p.lat() - lat) > 1e-5 || Math.abs(p.lng() - lng) > 1e-5) {
      marker.setMap(map); marker.setPosition({ lat, lng }); map.panTo({ lat, lng }); map.setZoom(Math.max(map.getZoom() || 0, 16))
    }
  }, [lat, lng, has, state])

  const applyCoords = () => {
    const a = parseFloat(latTxt); const b = parseFloat(lngTxt)
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) { setErrMsg('Enter valid coordinates, e.g. 0.313611 and 32.581111.'); return }
    if (a === lat && b === lng) return
    setErrMsg(''); api.current.settle?.(a, b, 17)
  }
  const here = () => {
    if (!navigator.geolocation) { setErrMsg('Your device does not support location.'); return }
    navigator.geolocation.getCurrentPosition((p) => { setErrMsg(''); api.current.settle?.(p.coords.latitude, p.coords.longitude, 18) },
      () => setErrMsg('Could not get your location (permission denied?).'), { enableHighAccuracy: true, timeout: 10000 })
  }
  const inputCls = 'px-3 py-2 rounded-lg border border-border bg-bg-input text-text-1 text-sm outline-none focus:border-accent-blue w-full mt-1'

  return (
    <div>
      <div className="mb-2">
        <div ref={searchEl} className="min-h-[44px]" aria-label="Search Google Maps for the shop or address" />
        {state === 'loading' && <div className="text-xs text-text-3 mt-1">Loading Google Maps…</div>}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <p className="text-xs text-text-3">Search for the shop or address, or click / drag the pin. The grid references and area fill in automatically.</p>
        <button type="button" onClick={here} className="px-2.5 py-1 rounded-md bg-bg-alt text-text-2 text-xs font-bold flex items-center gap-1.5"><Icon name="map-marker-alt" />My location</button>
      </div>
      {errMsg && <div role="alert" className="mb-2 text-xs text-accent-red flex gap-1.5"><Icon name="exclamation-circle" className="mt-0.5" />{errMsg}</div>}
      <div className="h-[340px] sm:h-[420px] rounded-xl overflow-hidden border border-border relative z-0 bg-bg-alt">
        <div ref={mapEl} className="w-full h-full" />
        {!has && state === 'ready' && <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none"><span className="px-3 py-1.5 rounded-full bg-bg-deep/85 text-white text-xs font-semibold">Search above or click the map to drop the pin</span></div>}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-xs font-semibold text-text-3">Latitude
          <input inputMode="decimal" value={latTxt} onChange={(e) => setLatTxt(e.target.value)} onBlur={applyCoords} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoords() } }} className={inputCls} /></label>
        <label className="text-xs font-semibold text-text-3">Longitude
          <input inputMode="decimal" value={lngTxt} onChange={(e) => setLngTxt(e.target.value)} onBlur={applyCoords} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoords() } }} className={inputCls} /></label>
      </div>
    </div>
  )
}
