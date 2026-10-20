// [minLat, maxLat, minLng, maxLng] — same rough boxes the backend validates against.
export const COUNTRY_BOUNDS = {
  Uganda: [-1.50, 4.30, 29.50, 35.10],
  Kenya: [-4.90, 5.20, 33.90, 41.90],
  Tanzania: [-11.80, -0.90, 29.30, 40.50],
  Rwanda: [-2.95, -1.00, 28.80, 30.95],
  Burundi: [-4.50, -2.30, 28.90, 30.90],
  'South Sudan': [3.40, 12.30, 24.10, 35.95],
  'DR Congo': [-13.50, 5.40, 12.15, 31.30],
}
export const toLeaflet = (b) => [[b[0], b[2]], [b[1], b[3]]]
export const inCountry = (country, lat, lng) => {
  const b = COUNTRY_BOUNDS[country]
  return !b || (lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3])
}
