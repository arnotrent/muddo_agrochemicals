import L from 'leaflet'

/**
 * Map pin whose TIP is exactly on the coordinate. (The old CSS "rotated square" pin was anchored by its box, so every
 * marker sat ~6–13 px south of the real spot — the pin the admin placed did not match the one visitors saw.)
 */
export function makePin(color = '#38BDF8', scale = 1) {
  const w = Math.round(30 * scale)
  const h = Math.round(42 * scale)
  return new L.DivIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 30 42" style="overflow:visible;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M15 1C7.3 1 1 7.3 1 15c0 9.8 14 26 14 26s14-16.2 14-26C29 7.3 22.7 1 15 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, Math.round((h * 41) / 42)], // the tip of the pin
    popupAnchor: [0, -h + 4],
  })
}
