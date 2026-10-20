import { GEO } from '../data/geo'

const norm = (s) => ` ${(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ')} `

/** Finds which known district/region of `country` a resolved address text mentions (earliest mention wins). */
export function detectArea(country, text) {
  const g = GEO[country]
  const t = norm(text)
  if (!g) return null
  let best = null
  const consider = (name, region, district) => {
    const i = t.indexOf(norm(name))
    if (i < 0) return
    if (!best || i < best.i || (i === best.i && name.length > best.len)) best = { i, len: name.length, region, district }
  }
  for (const [region, districts] of Object.entries(g)) {
    districts.forEach((d) => consider(d, region, d))
    if (!districts.length) consider(region, region, '')
  }
  return best ? { region: best.region, district: best.district } : null
}

/** Town / trading centre from a Nominatim `address` object. */
export const townOf = (a = {}) => a.village || a.town || a.suburb || a.neighbourhood || a.city_district || a.city || a.hamlet || ''
