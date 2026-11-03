import { useState } from 'react'
import LocationPicker from './LocationPicker'
import GooglePlacePicker from './GooglePlacePicker'
import { GOOGLE_KEY } from '../utils/googleMaps'
import Icon from './Icon'

/** Google Maps picker when a key is configured; otherwise (or if Google fails) the free OpenStreetMap picker — never a dead end. */
export default function LocationMapPicker({ onGooglePick, ...leaflet }) {
  const [failed, setFailed] = useState(!GOOGLE_KEY)
  if (!failed) {
    return <GooglePlacePicker lat={leaflet.lat} lng={leaflet.lng} onPick={onGooglePick} onFail={() => setFailed(true)} />
  }
  return (
    <div>
      <div className="mb-2.5 p-2.5 rounded-lg bg-bg-alt text-xs text-text-2 flex gap-2">
        <Icon name="info-circle" className="text-accent-blue mt-0.5" />
        {GOOGLE_KEY
          ? 'Google Maps could not load, so the free OpenStreetMap picker is shown. Check the Maps key, the enabled APIs and billing.'
          : 'Google Maps is not connected yet (VITE_GOOGLE_MAPS_KEY is not set), so the free OpenStreetMap picker is shown.'}
      </div>
      <LocationPicker {...leaflet} />
    </div>
  )
}
