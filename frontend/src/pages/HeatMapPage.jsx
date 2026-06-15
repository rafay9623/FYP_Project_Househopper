import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertCircle, Loader2, Map as MapIcon, Info, Layers, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import { propertiesApi } from '@/services/api.service'

const DEFAULT_CENTER = { lat: 30.3753, lng: 69.3451 }
const DEFAULT_ZOOM = 6
const MAPS_LOAD_TIMEOUT_MS = 15000
const HEATMAP_RADIUS = 50
const HEATMAP_MAX_INTENSITY = 4

// Transparent → blue → green → yellow → orange → red (red at highest density)
const HEATMAP_GRADIENT = [
  'rgba(0, 0, 0, 0)',
  'rgba(0, 255, 255, 1)',
  'rgba(0, 191, 255, 1)',
  'rgba(0, 127, 255, 1)',
  'rgba(0, 63, 255, 1)',
  'rgba(0, 0, 255, 1)',
  'rgba(0, 255, 0, 1)',
  'rgba(127, 255, 0, 1)',
  'rgba(255, 255, 0, 1)',
  'rgba(255, 191, 0, 1)',
  'rgba(255, 127, 0, 1)',
  'rgba(255, 63, 0, 1)',
  'rgba(255, 0, 0, 1)',
]

export default function HeatMapPage() {
  const divRef = useRef(null)
  const mapRef = useRef(null)
  const heatRef = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  const initDone = useRef(false)

  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState(null)

  // ── SINGLE sequential init ────────────────────────────────────────
  // Uses setInterval polling to wait for each prerequisite, then runs
  // the next step. Completely immune to React StrictMode.
  // ── Fetch data on mount (independent of map) ───────────────────
  useEffect(() => {
    let cancelled = false

    propertiesApi.getAllLocations()
      .then(data => {
        if (cancelled) return
        console.log('[HeatMap] Data received:', data)

        const locs = data?.locations || []
        const valid = locs.filter(
          l => l.location &&
            typeof l.location.latitude === 'number' &&
            typeof l.location.longitude === 'number'
        )
        setLocations(valid)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('[HeatMap] Fetch error:', err)
        const message = err.isNetworkError
          ? 'Unable to connect to server. Please make sure the backend server is running on port 3001.'
          : (err.message || 'Failed to load property data.')
        setError(message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── Initialize Google Map + apply heatmap data ─────────────────
  useEffect(() => {
    let cancelled = false
    let poll = null
    let timeoutId = null

    const reportMapsError = (message) => {
      if (cancelled) return
      setError(prev => prev ?? message)
      if (poll) clearInterval(poll)
      if (timeoutId) clearTimeout(timeoutId)
    }

    const clearMapsTimers = () => {
      if (poll) clearInterval(poll)
      if (timeoutId) clearTimeout(timeoutId)
    }

    // Step 1: Inject Google Maps script (idempotent)
    if (!document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
      if (!key) {
        reportMapsError('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in frontend/.env.')
        return () => { cancelled = true }
      }

      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=visualization&v=3.64`
      s.async = true
      s.defer = true
      s.onerror = () => {
        reportMapsError('Google Maps failed to load. Check VITE_GOOGLE_MAPS_API_KEY and enable Maps JavaScript API.')
      }
      document.head.appendChild(s)
    }

    // Step 2: Poll until Google Maps API is ready, then build the map
    poll = setInterval(() => {
      if (!window.google?.maps?.visualization) return
      if (!divRef.current) return

      clearMapsTimers()

      // If map is already on this DOM node, skip re-creation but mark as ready
      if (mapRef.current) {
        console.log('[HeatMap] Map already exists, marking ready')
        setMapReady(true)
        return
      }

      console.log('[HeatMap] Google Maps ready — building map')

      const g = window.google.maps

      // Create map
      const map = new g.Map(divRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      })
      mapRef.current = map
      infoRef.current = new g.InfoWindow()

      // Create heatmap layer — dissipating:true keeps hotspots visible in pixels at all zoom levels
      heatRef.current = new g.visualization.HeatmapLayer({
        radius: HEATMAP_RADIUS,
        opacity: 0.85,
        dissipating: true,
        maxIntensity: HEATMAP_MAX_INTENSITY,
        gradient: HEATMAP_GRADIENT,
        map,
      })

      console.log('[HeatMap] Map + heatmap layer created')
      setMapReady(true)
    }, 200)

    timeoutId = setTimeout(() => {
      if (!window.google?.maps?.visualization) {
        reportMapsError('Google Maps failed to load within 15 seconds. Check VITE_GOOGLE_MAPS_API_KEY.')
      }
    }, MAPS_LOAD_TIMEOUT_MS)

    // Cleanup — only clear timers, don't null refs (so StrictMode re-mount detects existing map)
    return () => {
      cancelled = true
      clearMapsTimers()
    }
  }, [])

  // ── Sync fetched data to heatmap layer ─────────────────────────
  // Runs when either locations data arrives OR the map becomes ready
  useEffect(() => {
    if (!mapReady || !heatRef.current || !window.google?.maps || locations.length === 0) return

    const g = window.google.maps
    const map = mapRef.current
    if (!map) return

    // Plain LatLng points — density at clusters (e.g. Lahore) drives red hotspots
    const pts = locations.map(l =>
      new g.LatLng(l.location.latitude, l.location.longitude)
    )

    const applyHeatData = () => {
      if (!heatRef.current) return
      heatRef.current.setData(pts)
      heatRef.current.setMap(showHeatmap ? map : null)
      console.log('[HeatMap] Heatmap data applied:', pts.length, 'points')
    }

    applyHeatData()

    // Auto-fit bounds, then refresh heat layer so intensity renders correctly
    try {
      const bounds = new g.LatLngBounds()
      pts.forEach(pt => bounds.extend(pt))
      map.fitBounds(bounds, 48)

      const onIdle = () => {
        applyHeatData()
        const zoom = map.getZoom()
        if (zoom !== undefined && zoom < 5) {
          map.setZoom(5)
        }
        if (pts.length === 1 && zoom !== undefined && zoom > 12) {
          map.setZoom(12)
        }
      }

      g.event.addListenerOnce(map, 'idle', onIdle)
    } catch (e) {
      console.error('[HeatMap] Failed to fit bounds:', e)
    }
  }, [locations, mapReady, showHeatmap])

  // ── Toggle heatmap / markers ──────────────────────────────────────
  const handleToggle = useCallback((heatmapMode) => {
    setShowHeatmap(heatmapMode)

    const map = mapRef.current
    if (!map || !window.google?.maps) return

    const g = window.google.maps

    // Toggle heatmap
    if (heatRef.current) {
      heatRef.current.setMap(heatmapMode ? map : null)
    }

    // Clear markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Create markers when NOT in heatmap mode
    if (!heatmapMode && locations.length > 0) {
      locations.forEach(loc => {
        const marker = new g.Marker({
          position: { lat: loc.location.latitude, lng: loc.location.longitude },
          map,
          title: loc.name,
        })
        marker.addListener('click', () => {
          const html = `<div style="padding:8px;min-width:180px;font-family:system-ui,sans-serif">
            <h3 style="margin:0 0 4px;font-size:14px;font-weight:600">${loc.name || 'Property'}</h3>
            <p style="margin:0;font-size:12px;color:#666">${loc.city || ''}</p>
            ${loc.propertyType ? `<p style="margin:4px 0 0;font-size:12px;color:#888;text-transform:capitalize">${loc.propertyType}</p>` : ''}
          </div>`
          infoRef.current?.setContent(html)
          infoRef.current?.open(map, marker)
        })
        markersRef.current.push(marker)
      })
    }
  }, [locations])

  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="dashboard" />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Property Heat Map</h1>
            <p className="text-muted-foreground mt-1">Visualize property distribution across regions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={showHeatmap ? 'default' : 'outline'} onClick={() => handleToggle(true)} size="sm" className="gap-1.5">
              <Layers className="h-4 w-4" /> Heatmap
            </Button>
            <Button variant={!showHeatmap ? 'default' : 'outline'} onClick={() => handleToggle(false)} size="sm" className="gap-1.5">
              <MapPin className="h-4 w-4" /> Markers
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-border shadow-md overflow-hidden">
          <CardContent className="p-0 relative">
            <div id="google-map-container" ref={divRef} style={{ width: '100%', height: '70vh', borderRadius: '0.5rem' }} />
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border shadow-lg z-10 hidden md:block">
              <div className="flex items-center gap-2 mb-1">
                <MapIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Overview</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading…</span>
                </div>
              ) : locations.length === 0 ? (
                <>
                  <div className="text-sm font-medium text-amber-500">No Data</div>
                  <div className="text-xs text-muted-foreground">No properties with location data found</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{locations.length}</div>
                  <div className="text-xs text-muted-foreground">Properties Mapped</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Heat map shows the density of listed properties. Switch to Markers to see individual pins.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
