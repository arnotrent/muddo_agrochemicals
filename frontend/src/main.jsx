import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { protectImages } from './utils/protectImages'
import 'leaflet/dist/leaflet.css'
import './index.css'

protectImages()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
