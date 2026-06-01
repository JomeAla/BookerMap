'use client'

import * as React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { divIcon, type LatLngTuple } from 'leaflet'
import { useLocationSocket } from '@/components/providers/socket-provider'

function createIcon(color: string) {
  return divIcon({
    className: '',
    html: `<div style="width: 24px; height: 24px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const technicianIcon = createIcon('#3B82F6')
const customerIcon = createIcon('#10B981')
const bookingLocationIcon = createIcon('#F59E0B')

function MapBoundsUpdater({ points }: { points: LatLngTuple[] }) {
  const map = useMap()
  React.useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] })
    }
  }, [points, map])
  return null
}

interface TechnicianTrackerProps {
  bookingId?: string
  technicianLat?: number | null
  technicianLng?: number | null
  customerLat?: number | null
  customerLng?: number | null
  bookingLat?: number | null
  bookingLng?: number | null
}

export default function TechnicianTracker({
  bookingId,
  technicianLat: initialTechLat,
  technicianLng: initialTechLng,
  customerLat,
  customerLng,
  bookingLat,
  bookingLng,
}: TechnicianTrackerProps) {
  const locationSocketRef = useLocationSocket()

  const [techLat, setTechLat] = React.useState(initialTechLat ?? bookingLat)
  const [techLng, setTechLng] = React.useState(initialTechLng ?? bookingLng)
  const [speed, setSpeed] = React.useState<number | null>(null)
  const [heading, setHeading] = React.useState<number | null>(null)

  const customerPos: LatLngTuple | null =
    customerLat != null && customerLng != null ? [customerLat, customerLng] : null
  const bookingPos: LatLngTuple | null =
    bookingLat != null && bookingLng != null ? [bookingLat, bookingLng] : null
  const targetPos = customerPos || bookingPos

  React.useEffect(() => {
    const socket = locationSocketRef?.current
    if (!socket || !bookingId) return

    socket.emit('joinTracking', bookingId)
    socket.on('locationUpdate', (data: { latitude: number; longitude: number; speed?: number; heading?: number }) => {
      setTechLat(data.latitude)
      setTechLng(data.longitude)
      if (data.speed != null) setSpeed(data.speed)
      if (data.heading != null) setHeading(data.heading)
    })

    return () => {
      socket.emit('leaveTracking', bookingId)
      socket.off('locationUpdate')
    }
  }, [locationSocketRef, bookingId])

  const points: LatLngTuple[] = []
  if (techLat != null && techLng != null) points.push([techLat, techLng])
  if (targetPos) points.push(targetPos)

  const center: LatLngTuple = techLat != null && techLng != null ? [techLat, techLng] : targetPos || [6.5244, 3.3792]

  function formatSpeed(s: number | null) {
    if (s == null) return null
    return `${(s * 3.6).toFixed(1)} km/h`
  }

  const distance =
    techLat != null && techLng != null && targetPos
      ? getDistance(techLat, techLng, targetPos[0], targetPos[1])
      : null

  const etaMinutes = distance && speed && speed > 0 ? Math.round(distance / (speed * 3.6 * 60)) : distance && distance < 0.5 ? 1 : distance ? Math.round(distance / 0.5) : null

  return (
    <div className="space-y-3">
      <div className="h-[300px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBoundsUpdater points={points} />
          {techLat != null && techLng != null && (
            <Marker position={[techLat, techLng]} icon={technicianIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Technician</p>
                  {speed != null && <p className="text-gray-500">{formatSpeed(speed)}</p>}
                  {heading != null && <p className="text-gray-500">Heading: {heading.toFixed(0)}°</p>}
                </div>
              </Popup>
            </Marker>
          )}
          {targetPos && (
            <Marker position={targetPos} icon={customerIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{customerPos ? 'Customer' : 'Booking Location'}</p>
                </div>
              </Popup>
            </Marker>
          )}
          {techLat != null && techLng != null && targetPos && (
            <Polyline positions={[[techLat, techLng], targetPos]} color="#3B82F6" dashArray="10 5" weight={2} opacity={0.6} />
          )}
        </MapContainer>
      </div>
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
        {distance != null && (
          <span className="flex items-center gap-1">
            <span className="font-medium">Distance:</span> {distance.toFixed(1)} km
          </span>
        )}
        {etaMinutes != null && (
          <span className="flex items-center gap-1">
            <span className="font-medium">Est. Arrival:</span> ~{etaMinutes} min
          </span>
        )}
        {speed != null && (
          <span className="flex items-center gap-1">
            <span className="font-medium">Speed:</span> {formatSpeed(speed)}
          </span>
        )}
      </div>
    </div>
  )
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
