import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, HeatmapLayer, InfoWindow, Marker } from '@react-google-maps/api'
import { AlertCircle, Loader2, Map as MapIcon, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import { propertiesApi } from '@/services/api.service'

// Default center (Pakistan)
const DEFAULT_CENTER = {
    lat: 30.3753,
    lng: 69.3451
}

const DEFAULT_ZOOM = 6

const mapContainerStyle = {
    width: '100%',
    height: '70vh',
    borderRadius: '0.5rem'
}

const libraries = ['visualization']

export default function HeatMapPage() {
    const [map, setMap] = useState(null)
    const [heatmapData, setHeatmapData] = useState([])
    const [markers, setMarkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedProperty, setSelectedProperty] = useState(null)
    const [showHeatmap, setShowHeatmap] = useState(true)

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries
    })

    // Fetch property locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoading(true)
                // Use the new public endpoint
                // Start fetching...
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/properties/all-locations`)

                if (!response.ok) {
                    throw new Error('Failed to fetch property data')
                }

                const data = await response.json()

                if (data.success && data.locations) {
                    // Prepare data for HeatmapLayer
                    // We need google.maps.LatLng objects, but we can't create them until API is loaded
                    // So we store raw data first
                    const validLocations = data.locations.filter(
                        loc => loc.location && typeof loc.location.latitude === 'number' && typeof loc.location.longitude === 'number'
                    )

                    setMarkers(validLocations)
                }
            } catch (err) {
                console.error('Error fetching heatmap data:', err)
                setError('Failed to load property data. Please try again later.')
            } finally {
                setLoading(false)
            }
        }

        fetchLocations()
    }, [])

    // Prepare heatmap data when API is loaded and data is ready
    useEffect(() => {
        if (isLoaded && markers.length > 0 && window.google) {
            const points = markers.map(m => ({
                location: new window.google.maps.LatLng(m.location.latitude, m.location.longitude),
                weight: 1 // We could use price or other metrics for weight
            }))
            setHeatmapData(points)
        }
    }, [isLoaded, markers])

    const onLoad = useCallback(function callback(map) {
        setMap(map)
    }, [])

    const onUnmount = useCallback(function callback(map) {
        setMap(null)
    }, [])

    if (loadError) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar variant="dashboard" />
                <div className="container mx-auto p-8">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading Google Maps. Please check if your API key is configured correctly in .env file (VITE_GOOGLE_MAPS_API_KEY).
                            <br />
                            Details: {loadError.message}
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar variant="dashboard" />

            <div className="container mx-auto px-4 py-8 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Property Heat Map</h1>
                        <p className="text-muted-foreground mt-1">
                            Visualize property distribution across regions
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={showHeatmap ? "default" : "outline"}
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            size="sm"
                        >
                            Toggle Heatmap
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
                        {!isLoaded ? (
                            <div className="h-[70vh] w-full flex flex-col items-center justify-center bg-muted/20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground">Loading Map...</p>
                            </div>
                        ) : (
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={DEFAULT_CENTER}
                                zoom={DEFAULT_ZOOM}
                                onLoad={onLoad}
                                onUnmount={onUnmount}
                                options={{
                                    styles: [
                                        {
                                            featureType: "poi",
                                            elementType: "labels",
                                            stylers: [{ visibility: "off" }],
                                        },
                                    ],
                                    mapTypeControl: false,
                                    streetViewControl: false,
                                }}
                            >
                                {/* Heatmap Layer */}
                                {showHeatmap && heatmapData.length > 0 && (
                                    <HeatmapLayer
                                        data={heatmapData}
                                        options={{
                                            radius: 30,
                                            opacity: 0.7,
                                            gradient: [
                                                'rgba(0, 255, 255, 0)',
                                                'rgba(0, 255, 255, 1)',
                                                'rgba(0, 191, 255, 1)',
                                                'rgba(0, 127, 255, 1)',
                                                'rgba(0, 63, 255, 1)',
                                                'rgba(0, 0, 255, 1)',
                                                'rgba(0, 0, 223, 1)',
                                                'rgba(0, 0, 191, 1)',
                                                'rgba(0, 0, 159, 1)',
                                                'rgba(0, 0, 127, 1)',
                                                'rgba(63, 0, 91, 1)',
                                                'rgba(127, 0, 63, 1)',
                                                'rgba(191, 0, 31, 1)',
                                                'rgba(255, 0, 0, 1)'
                                            ]
                                        }}
                                    />
                                )}

                                {/* Individual Markers (visible when heatmap is off or optionally) */}
                                {!showHeatmap && markers.map((marker) => (
                                    <Marker
                                        key={marker.id}
                                        position={{
                                            lat: marker.location.latitude,
                                            lng: marker.location.longitude
                                        }}
                                        onClick={() => setSelectedProperty(marker)}
                                    />
                                ))}

                                {/* Info Window for Selected Property */}
                                {selectedProperty && (
                                    <InfoWindow
                                        position={{
                                            lat: selectedProperty.location.latitude,
                                            lng: selectedProperty.location.longitude
                                        }}
                                        onCloseClick={() => setSelectedProperty(null)}
                                    >
                                        <div className="p-2 min-w-[200px]">
                                            <h3 className="font-semibold text-sm mb-1">{selectedProperty.name}</h3>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <p>{selectedProperty.city}, {selectedProperty.province}</p>
                                                {selectedProperty.propertyType && <p className="capitalize">{selectedProperty.propertyType}</p>}
                                            </div>
                                        </div>
                                    </InfoWindow>
                                )}
                            </GoogleMap>
                        )}

                        {/* Stats Overlay */}
                        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border shadow-lg z-10 hidden md:block">
                            <div className="flex items-center gap-2 mb-1">
                                <MapIcon className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-sm">Overview</span>
                            </div>
                            <div className="text-2xl font-bold">{markers.length}</div>
                            <div className="text-xs text-muted-foreground">Properties Mapped</div>
                        </div>
                    </CardContent>
                </Card>

                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Heat map shows the density of listed properties. Toggle to see individual markers.
                        Zoom in to specific cities for better detail.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    )
}
