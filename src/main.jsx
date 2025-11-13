import React from 'react'
import { createRoot } from 'react-dom/client'
import PiVisualization from './PiVisualization.jsx'
import './index.css'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <PiVisualization />
  </React.StrictMode>
)
