import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { distributorsApi } from '../../api/services'
import Icon from '../../components/Icon'

// Leaflet's default marker icons reference bundled image paths that Vite
// doesn't resolve automatically — replaced with the same blue divIcon
// pin the original site used (drawn in CSS, no external image needed).
const pinIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#38BDF8;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, 13, { animate: true })
  }, [position, map])
  return null
}

export default function DistributorsPage() {
  const [distributors, setDistributors] = useState([])
  const [region, setRegion] = useState('')
  const [query, setQuery] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)

  useEffect(() => {
    distributorsApi.list({ page_size: 200 }).then(({ data }) => setDistributors(data.results || data))
  }, [])

  const regions = useMemo(() => [...new Set(distributors.map((d) => d.region))].sort(), [distributors])

  const filtered = distributors.filter((d) => {
    const matchesRegion = !region || d.region === region
    const q = query.toLowerCase()
    const matchesQuery = !q || d.name.toLowerCase().includes(q) || d.district.toLowerCase().includes(q)
    return matchesRegion && matchesQuery
  })

  return (
    <>
      <section className="py-10" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-xs text-white/65 mb-2.5">Home / <span className="text-accent-blue font-bold">Find a Store</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white my-3">Find a Store Near You</h1>
          <p className="text-white/85 max-w-[55ch]">{distributors.length} authorised MACL outlets across all four regions of Uganda.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="h-[420px] rounded-2xl overflow-hidden border border-border mb-8">
            <MapContainer center={[1.3733, 32.2903]} zoom={6.4} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {distributors.map((d) => d.lat && d.lng && (
                <Marker key={d.id} position={[d.lat, d.lng]} icon={pinIcon}>
                  <Popup>
                    <b>{d.name}</b><br />{d.district}, {d.region}
                    {d.phone && <><br /><a href={`tel:${d.phone}`}>{d.phone}</a></>}
                  </Popup>
                </Marker>
              ))}
              <FlyTo position={flyTarget} />
            </MapContainer>
          </div>

          <div className="flex gap-2.5 flex-wrap items-center mb-7">
            <button onClick={() => setRegion('')} className={`px-4.5 py-2 rounded-full text-sm font-bold border ${!region ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-card text-text-2 border-border'}`}>All Regions</button>
            {regions.map((r) => (
              <button key={r} onClick={() => setRegion(r)} className={`px-4.5 py-2 rounded-full text-sm font-bold border ${region === r ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-card text-text-2 border-border'}`}>{r}</button>
            ))}
            <div className="ml-auto relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or district…" className="pl-8.5 pr-3 py-2 rounded-lg border border-border bg-bg-input text-text-1 outline-none w-60" />
            </div>
            <span className="text-sm font-bold text-text-3 bg-bg-alt px-3 py-2 rounded-lg">{filtered.length} outlets</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filtered.map((d) => (
              <div key={d.id} onClick={() => setFlyTarget([d.lat, d.lng])} className="bg-bg-card border border-border rounded-2xl p-5.5 cursor-pointer hover:-translate-y-1 transition-transform">
                <div className="flex justify-between items-start mb-3.5">
                  <div>
                    <div className="font-bold text-text-1 mb-1">{d.name}</div>
                    <span className="text-xs bg-bg-alt text-accent-blue px-2 py-0.5 rounded-full">{d.region}</span>
                    <span className="text-xs text-text-3 ml-1.5">{d.district}</span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0">
                    <Icon name="store" />
                  </div>
                </div>
                {d.address && <p className="text-sm text-text-3 mb-1.5 flex gap-1.5"><Icon name="map-marker-alt" className="text-accent-blue mt-0.5" />{d.address}</p>}
                {d.phone && (
                  <p className="text-sm font-semibold mb-1.5 flex gap-1.5">
                    <Icon name="phone" className="text-accent-blue mt-0.5" />
                    <a href={`tel:${d.phone}`} onClick={(e) => e.stopPropagation()} className="text-accent-blue">{d.phone}</a>
                  </p>
                )}
              </div>
            ))}
            {!filtered.length && (
              <div className="col-span-full text-center py-12 text-text-3">No outlets match your search.</div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
