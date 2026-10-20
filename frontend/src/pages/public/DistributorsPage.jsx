import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { distributorsApi } from '../../api/services'
import { gmapsPlace, gmapsDirections, gmapsEmbed } from '../../utils/geocode'
import PageHero from '../../components/PageHero'
import Icon from '../../components/Icon'

// Leaflet's default marker icons reference bundled image paths that Vite doesn't resolve —
// replaced with a CSS-drawn pin (no external image needed). The selected outlet turns red.
const pin = (active) => new L.DivIcon({
  className: '',
  html: `<div style="width:${active ? 34 : 28}px;height:${active ? 34 : 28}px;border-radius:50% 50% 50% 0;background:${active ? '#EF4444' : '#38BDF8'};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
  iconSize: [28, 28], iconAnchor: [14, 28],
})

function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => { if (position) map.setView(position, 14, { animate: true }) }, [position, map])
  return null
}

const place = (d) => [d.town, d.district, d.region, d.country].filter(Boolean).join(', ')

export default function DistributorsPage() {
  const [all, setAll] = useState([])
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const detailRef = useRef(null)

  useEffect(() => { distributorsApi.list({ page_size: 300 }).then(({ data }) => setAll(data.results || data)).finally(() => setLoading(false)) }, [])

  const countries = useMemo(() => [...new Set(all.map((d) => d.country))].sort(), [all])
  const regions = useMemo(() => [...new Set(all.filter((d) => !country || d.country === country).map((d) => d.region))].sort(), [all, country])
  const filtered = all.filter((d) => {
    const q = query.trim().toLowerCase()
    return (!country || d.country === country) && (!region || d.region === region) &&
      (!q || [d.name, d.district, d.town, d.region, d.address].some((x) => (x || '').toLowerCase().includes(q)))
  })
  const sel = all.find((d) => d.id === selected)
  const select = (id) => { setSelected(id); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) }

  return (
    <>
      <PageHero
        bg="/images/store_locator_map.png"
        side={{ src: '/images/find_store_map_katooke.png', alt: 'Map showing the Muddo Agro Chemicals pin near Katooke market and Kakira', caption: 'Every outlet is pinned on the map — open one to see it on Google Maps.', w: 757, h: 294 }}
        crumbs={[['Home', '/'], ['Find a Store']]}
        eyebrow="Store locator" icon={<Icon name="map-marked-alt" />}
        title="Find a Store Near You"
        subtitle={loading ? 'Loading outlets…' : `${all.length} authorised MACL outlet${all.length !== 1 ? 's' : ''}${countries.length > 1 ? ` across ${countries.length} countries` : ' across Uganda'} — with directions on Google Maps.`}
      />

      <section className="py-12">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="h-[420px] rounded-2xl overflow-hidden border border-border mb-8 relative z-0">
            <MapContainer center={[1.3733, 32.2903]} zoom={6.4} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.map((d) => d.lat && d.lng && (
                <Marker key={d.id} position={[d.lat, d.lng]} icon={pin(d.id === selected)} eventHandlers={{ click: () => select(d.id) }}>
                  <Popup>
                    <b>{d.name}</b><br />{place(d)}
                    {d.phone && <><br /><a href={`tel:${d.phone}`}>{d.phone}</a></>}
                    <br /><a href={gmapsDirections(d.lat, d.lng)} target="_blank" rel="noreferrer">Directions ↗</a>
                  </Popup>
                </Marker>
              ))}
              {sel && <FlyTo position={[sel.lat, sel.lng]} />}
            </MapContainer>
          </div>

          <div className="flex gap-2.5 flex-wrap items-center mb-7">
            <select aria-label="Country" value={country} onChange={(e) => { setCountry(e.target.value); setRegion('') }} className="px-3.5 py-2 rounded-full border border-border bg-bg-card text-text-2 text-sm font-bold">
              <option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => setRegion('')} className={`px-4 py-2 rounded-full text-sm font-bold border ${!region ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-card text-text-2 border-border'}`}>All regions</button>
            {regions.map((r) => <button key={r} onClick={() => setRegion(r)} className={`px-4 py-2 rounded-full text-sm font-bold border ${region === r ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-card text-text-2 border-border'}`}>{r}</button>)}
            <div className="ml-auto relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search outlets" placeholder="Search by name, town or district…" className="pl-9 pr-3 py-2 rounded-lg border border-border bg-bg-input text-text-1 outline-none w-64 max-w-full" />
            </div>
            <span className="text-sm font-bold text-text-3 bg-bg-alt px-3 py-2 rounded-lg">{filtered.length} outlet{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div ref={detailRef} className="scroll-mt-24" aria-live="polite">
            {sel && (
              <div className="mb-8 bg-bg-card border border-accent-blue rounded-2xl overflow-hidden grid lg:grid-cols-[1fr_1.3fr]">
                <div className="p-6">
                  <div className="flex justify-between items-start gap-3">
                    <div><div className="text-xs font-bold uppercase tracking-wide text-accent-blue mb-1">Selected outlet</div><h2 className="text-xl font-bold text-text-1">{sel.name}</h2></div>
                    <button onClick={() => setSelected(null)} aria-label="Close outlet details" className="text-text-3"><Icon name="times" /></button>
                  </div>
                  <p className="text-sm text-text-3 mt-1 mb-4">{place(sel)}</p>
                  {sel.address && <p className="text-sm text-text-2 mb-2 flex gap-2"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{sel.address}</p>}
                  {sel.location_details && <p className="text-sm text-text-2 mb-2 flex gap-2 leading-relaxed"><Icon name="info-circle" className="text-accent-blue mt-0.5" />{sel.location_details}</p>}
                  {sel.phone && <p className="text-sm font-semibold mb-2 flex gap-2"><Icon name="phone" className="text-accent-blue mt-0.5" /><a href={`tel:${sel.phone}`} className="text-accent-blue">{sel.phone}</a></p>}
                  {sel.email && <p className="text-sm mb-2 flex gap-2"><Icon name="envelope" className="text-accent-blue mt-0.5" /><a href={`mailto:${sel.email}`} className="text-accent-blue break-all">{sel.email}</a></p>}
                  <div className="flex gap-2.5 flex-wrap mt-5">
                    <a href={gmapsDirections(sel.lat, sel.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-accent-blue text-white font-bold text-sm"><Icon name="directions" />Get directions</a>
                    <a href={gmapsPlace(sel.lat, sel.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn border border-border text-text-2 font-bold text-sm"><Icon name="map-marker-alt" />Open in Google Maps</a>
                  </div>
                </div>
                <iframe title={`${sel.name} on Google Maps`} src={gmapsEmbed(sel.lat, sel.lng)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="w-full h-[320px] lg:h-full min-h-[300px] border-0 bg-bg-alt" />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filtered.map((d) => (
              <article key={d.id} className={`bg-bg-card border rounded-2xl p-5.5 hover:-translate-y-1 transition-transform ${d.id === selected ? 'border-accent-blue' : 'border-border'}`}>
                <button onClick={() => select(d.id)} className="block w-full text-left">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-text-1 mb-1">{d.name}</div>
                      <span className="text-xs bg-bg-alt text-accent-blue px-2 py-0.5 rounded-full">{d.region}</span>
                      <span className="text-xs text-text-3 ml-1.5">{[d.town, d.district].filter(Boolean).join(' · ')}</span>
                      {countries.length > 1 && <span className="text-xs text-text-4 ml-1.5">{d.country}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><Icon name="store" /></div>
                  </div>
                  {d.address && <p className="text-sm text-text-3 mb-1.5 flex gap-1.5"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{d.address}</p>}
                </button>
                {d.phone && <p className="text-sm font-semibold mb-3 flex gap-1.5"><Icon name="phone" className="text-accent-blue mt-0.5" /><a href={`tel:${d.phone}`} className="text-accent-blue">{d.phone}</a></p>}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button onClick={() => select(d.id)} className="flex-1 text-center py-2 rounded-btn bg-bg-alt text-text-2 text-xs font-bold">View location</button>
                  <a href={gmapsDirections(d.lat, d.lng)} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 rounded-btn bg-accent-blue text-white text-xs font-bold">Directions</a>
                </div>
              </article>
            ))}
            {!loading && !filtered.length && <div className="col-span-full text-center py-12 text-text-3">No outlets match your search.</div>}
          </div>
        </div>
      </section>
    </>
  )
}
