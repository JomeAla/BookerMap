'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { divIcon, type LatLngTuple } from 'leaflet'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Navigation, MapPin, X, ChevronUp, ChevronDown } from 'lucide-react'

interface RouteStep {
  instruction: string
  name: string
  distance: number
  duration: number
  maneuver: string
  modifier?: string
  location: [number, number]
}

interface RouteData {
  distance: number
  duration: number
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  steps: RouteStep[]
}

export interface NavigationPanelProps {
  destLat: number
  destLng: number
  destLabel: string
  currentLat: number | null
  currentLng: number | null
  onClose: () => void
}

function createIcon(color: string, pulse = false) {
  const pulseStyle = pulse ? `animation: navPulse 1.5s ease-out infinite;` : ''
  return divIcon({
    className: '',
    html: `<div style="width: 28px; height: 28px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4); ${pulseStyle}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const originIcon = createIcon('#3B82F6', true)
const destIcon = createIcon('#DC2626')

function MapBoundsUpdater({ points }: { points: LatLngTuple[] }) {
  const map = useMap()
  React.useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [60, 60] })
    else if (points.length === 1) map.setView(points[0], 15)
  }, [points, map])
  return null
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function NavigationPanel({ destLat, destLng, destLabel, currentLat, currentLng, onClose }: NavigationPanelProps) {
  const [activeStepIdx, setActiveStepIdx] = React.useState(0)
  const [showStepList, setShowStepList] = React.useState(true)

  const hasOrigin = currentLat != null && currentLng != null
  const effectiveOrigin = hasOrigin
    ? { lat: currentLat!, lng: currentLng! }
    : null

  const { data: route, isLoading, error } = useQuery({
    queryKey: ['routing-route', effectiveOrigin?.lat, effectiveOrigin?.lng, destLat, destLng],
    queryFn: async () => {
      if (!effectiveOrigin) throw new Error('No origin')
      const { data } = await api.get('/routing/route', {
        params: {
          originLat: effectiveOrigin.lat,
          originLng: effectiveOrigin.lng,
          destLat,
          destLng,
        },
      })
      return data.data as RouteData
    },
    enabled: !!effectiveOrigin,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  React.useEffect(() => {
    if (currentLat != null && currentLng != null && route?.steps?.length) {
      let nearest = 0
      let nearestDist = Infinity
      route.steps.forEach((step, idx) => {
        const d = getDistance(currentLat, currentLng, step.location[1], step.location[0])
        if (d < nearestDist) {
          nearestDist = d
          nearest = idx
        }
      })
      setActiveStepIdx(nearest)
    }
  }, [currentLat, currentLng, route])

  const routeCoords: LatLngTuple[] = (route?.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng])

  const mapPoints: LatLngTuple[] = [
    ...(currentLat != null && currentLng != null ? ([[currentLat, currentLng] as LatLngTuple]) : []),
    ...routeCoords,
    [destLat, destLng] as LatLngTuple,
  ]

  const activeStep = route?.steps?.[activeStepIdx]
  const remainingDistance = (route?.distance || 0) - (route?.steps || []).slice(0, activeStepIdx).reduce((s, x) => s + x.distance, 0)
  const remainingDuration = (route?.duration || 0) - (route?.steps || []).slice(0, activeStepIdx).reduce((s, x) => s + x.duration, 0)

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex flex-col">
      <style>{`@keyframes navPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }`}</style>

      <div className="flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Navigation className="h-5 w-5 text-blue-400" />
          <span className="font-semibold">Navigation</span>
          <span className="text-gray-400 text-sm">to {destLabel}</span>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Spinner />
              <p className="text-gray-300 text-sm">Calculating route...</p>
            </div>
          </div>
        ) : error || !route ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-300 max-w-sm px-4">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Route unavailable</p>
              <p className="text-sm mt-1 text-gray-400">
                {!hasOrigin
                  ? 'Enable location sharing, then try again.'
                  : 'Could not fetch route from the routing service. Try again later.'}
              </p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[currentLat ?? destLat, currentLng ?? destLng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsUpdater points={mapPoints} />

            {currentLat != null && currentLng != null && (
              <Marker position={[currentLat, currentLng]} icon={originIcon}>
                <Popup>Current Location</Popup>
              </Marker>
            )}
            <Marker position={[destLat, destLng]} icon={destIcon}>
              <Popup>{destLabel}</Popup>
            </Marker>

            {routeCoords.length > 1 && (
              <Polyline positions={routeCoords} color="#3B82F6" weight={6} opacity={0.85} />
            )}
            {routeCoords.length > 1 && (
              <Polyline positions={routeCoords} color="#1D4ED8" weight={2} opacity={1} dashArray="6 8" />
            )}
          </MapContainer>
        )}
      </div>

      {!error && route && (
        <div className="bg-gray-900 border-t border-gray-700 text-white shrink-0">
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Next</p>
              <p className="font-semibold text-sm line-clamp-2">{activeStep?.instruction || 'Arriving'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Distance</p>
              <p className="font-semibold text-base text-blue-300">
                {formatDistance(Math.max(remainingDistance, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">ETA</p>
              <p className="font-semibold text-base text-blue-300">
                {formatDuration(Math.max(remainingDuration, 0))}
              </p>
            </div>
          </div>

          <div className="px-2 pb-2">
            <button
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-white"
              onClick={() => setShowStepList(!showStepList)}
            >
              {showStepList ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {showStepList ? 'Hide steps' : `${route.steps?.length || 0} steps`}
            </button>

            {showStepList && route.steps?.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-1 mt-1 pr-1">
                {route.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm ${
                      idx === activeStepIdx
                        ? 'bg-blue-600/30 border border-blue-500 text-white'
                        : idx < activeStepIdx
                        ? 'text-gray-500 opacity-60'
                        : 'text-gray-200'
                    }`}
                  >
                    <span className="font-mono text-xs w-6 text-gray-400 shrink-0">{idx + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-tight">{step.instruction}</p>
                      <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                        {step.distance > 0 && <span>{formatDistance(step.distance)}</span>}
                        {step.duration > 0 && <span>{formatDuration(step.duration)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-green-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Arrive at {destLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}