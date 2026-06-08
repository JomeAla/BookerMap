'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { divIcon, type LatLngTuple } from 'leaflet'
import type { Dispatch, LocationUpdate } from '@/types'
import { io, Socket } from 'socket.io-client'
import {
  MapPin, Navigation, Wifi, WifiOff, X, ChevronLeft, ChevronRight,
  Search, Users, Truck, Clock, RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function createColoredIcon(color: string, pulse: boolean) {
  return divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px;">
      <div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);${pulse ? 'animation:pulse 2s infinite;' : ''}"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const blueIcon = createColoredIcon('#3B82F6', false)
const greenIcon = createColoredIcon('#10B981', false)
const blueIconPulse = createColoredIcon('#3B82F6', true)
const selectedIcon = createColoredIcon('#F59E0B', false)

function MapCenterUpdater({ center }: { center: LatLngTuple }) {
  const map = useMap()
  React.useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.6 })
  }, [center, map])
  return null
}

function MapBoundsUpdater({ points }: { points: LatLngTuple[] }) {
  const map = useMap()
  React.useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] })
    }
  }, [points, map])
  return null
}

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function TrackingPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = React.useRef<Socket | null>(null)

  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [selectedTechId, setSelectedTechId] = React.useState<string | null>(null)
  const [routePoints, setRoutePoints] = React.useState<LatLngTuple[]>([])
  const [routeLoading, setRouteLoading] = React.useState(false)
  const [latestLocations, setLatestLocations] = React.useState<Record<string, LocationUpdate>>({})
  const [connected, setConnected] = React.useState(false)
  const [initFitDone, setInitFitDone] = React.useState(false)

  const { data: dispatches, isLoading: dispLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: async () => {
      const { data } = await api.get('/dispatches')
      return (data.data as Dispatch[]).filter(
        (d) => (d.status as string) === 'ACCEPTED' || (d.status as string) === 'STARTED' || (d.status as string) === 'ASSIGNED',
      )
    },
    refetchInterval: 30000,
  })

  const activeTechs = React.useMemo(() => {
    if (!dispatches) return []
    const seen = new Set<string>()
    return dispatches.filter((d) => {
      if (!d.assignedToId || seen.has(d.assignedToId)) return false
      seen.add(d.assignedToId)
      return true
    })
  }, [dispatches])

  React.useEffect(() => {
    if (!activeTechs.length) return
    const fetches = activeTechs.map((d) =>
      api
        .get(`/locations/latest/${d.assignedToId}`)
        .then(({ data }) => data.data)
        .catch(() => null),
    )
    Promise.all(fetches).then((results) => {
      const locs: Record<string, LocationUpdate> = {}
      results.forEach((loc, i) => {
        if (loc) locs[activeTechs[i].assignedToId!] = loc
      })
      setLatestLocations(locs)
    })
  }, [activeTechs])

  React.useEffect(() => {
    if (!initFitDone && Object.keys(latestLocations).length > 0) {
      setInitFitDone(true)
    }
  }, [latestLocations, initFitDone])

  React.useEffect(() => {
    if (!user?.tenantId) return
    const token = localStorage.getItem('bm_token')
    const socket = io(`${SOCKET_URL}/location`, {
      auth: { token },
      query: { tenantId: user.tenantId },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('locationUpdate', (locData: LocationUpdate & { userId?: string }) => {
      setLatestLocations((prev) => {
        const uid = locData.userId
        if (!uid) return prev
        return { ...prev, [uid]: locData }
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user?.tenantId])

  React.useEffect(() => {
    const socket = socketRef.current
    if (!socket || !dispatches) return
    dispatches.forEach((d) => {
      if (d.bookingId) socket.emit('joinTracking', d.bookingId)
    })
    return () => {
      dispatches.forEach((d) => {
        if (d.bookingId) socket.emit('leaveTracking', d.bookingId)
      })
    }
  }, [dispatches])

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!activeTechs.length) return
      activeTechs.forEach((d) => {
        api
          .get(`/locations/latest/${d.assignedToId}`)
          .then(({ data }) => {
            if (data.data) {
              setLatestLocations((prev) => ({
                ...prev,
                [d.assignedToId!]: data.data,
              }))
            }
          })
          .catch(() => {})
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [activeTechs])

  const handleSelectTech = React.useCallback(
    async (techId: string, bookingId?: string) => {
      setSelectedTechId(techId)
      if (bookingId) {
        setRouteLoading(true)
        try {
          const { data } = await api.get(`/locations/history/${bookingId}`)
          const history: LocationUpdate[] = data.data || []
          setRoutePoints(
            history
              .filter((p) => p.latitude != null && p.longitude != null)
              .map((p) => [p.latitude, p.longitude] as LatLngTuple),
          )
        } catch {
          setRoutePoints([])
        } finally {
          setRouteLoading(false)
        }
      } else {
        setRoutePoints([])
      }
    },
    [],
  )

  const filteredDispatches = React.useMemo(() => {
    if (!dispatches) return []
    if (!search) return dispatches
    const q = search.toLowerCase()
    return dispatches.filter((d) => {
      const techName = `${d.assignedTo?.firstName} ${d.assignedTo?.lastName}`.toLowerCase()
      const custName = `${d.booking?.customer?.firstName} ${d.booking?.customer?.lastName}`.toLowerCase()
      return techName.includes(q) || custName.includes(q)
    })
  }, [dispatches, search])

  const allTechPoints: LatLngTuple[] = React.useMemo(() => {
    return activeTechs
      .map((d) => {
        const loc = latestLocations[d.assignedToId!]
        if (loc?.latitude != null && loc?.longitude != null) {
          return [loc.latitude, loc.longitude] as LatLngTuple
        }
        return null
      })
      .filter(Boolean) as LatLngTuple[]
  }, [activeTechs, latestLocations])

  const selectedLoc = selectedTechId ? latestLocations[selectedTechId] : null

  const enRouteCount = dispatches?.filter((d) => (d.status as string) === 'ACCEPTED' || (d.status as string) === 'ASSIGNED').length || 0
  const onSiteCount = dispatches?.filter((d) => (d.status as string) === 'STARTED').length || 0

  function getMarkerColor(status: string) {
    if ((status as string) === 'STARTED') return '#10B981'
    return '#3B82F6'
  }

  function getDisplayStatus(status: string) {
    switch (status as string) {
      case 'ACCEPTED':
        return 'En Route'
      case 'ASSIGNED':
        return 'Assigned'
      default:
        return (status as string).charAt(0) + (status as string).slice(1).toLowerCase()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
      `}</style>

      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Live Tracking</h1>
          <span className="flex items-center gap-1.5 text-xs">
            {connected ? (
              <><Wifi className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600 dark:text-green-400">Live</span></>
            ) : (
              <><WifiOff className="h-3.5 w-3.5 text-red-500" /><span className="text-red-600 dark:text-red-400">Disconnected</span></>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-700 dark:text-blue-300">{activeTechs.length} Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-700 dark:text-amber-300">{enRouteCount} En Route</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20">
            <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300">{onSiteCount} On Site</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dispatches'] })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {dispLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : !filteredDispatches.length ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No active dispatches</p>
                  <p className="text-xs mt-1">Technicians appear here when assigned to jobs</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredDispatches.map((dispatch) => {
                    const loc = latestLocations[dispatch.assignedToId!]
                    const isSelected = selectedTechId === dispatch.assignedToId
                    return (
                      <button
                        key={dispatch.id}
                        onClick={() => handleSelectTech(dispatch.assignedToId!, dispatch.bookingId)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getMarkerColor(dispatch.status) }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {dispatch.assignedTo?.firstName} {dispatch.assignedTo?.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {dispatch.booking?.customer?.firstName} {dispatch.booking?.customer?.lastName}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={dispatch.status} />
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {loc?.timestamp ? timeSince(loc.timestamp) : '--'}
                            </span>
                          </div>
                        </div>
                        {loc?.speed != null && (
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {(loc.speed * 3.6).toFixed(0)} km/h
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 relative">
          <MapContainer
            center={[6.5244, 3.3792]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {allTechPoints.length > 0 && !initFitDone && (
              <MapBoundsUpdater points={allTechPoints} />
            )}
            {selectedLoc?.latitude != null && selectedLoc?.longitude != null && (
              <MapCenterUpdater center={[selectedLoc.latitude, selectedLoc.longitude]} />
            )}

            {activeTechs.map((d) => {
              const loc = latestLocations[d.assignedToId!]
              if (!loc?.latitude || !loc?.longitude) return null
              const isSelected = d.assignedToId === selectedTechId
              const color = getMarkerColor(d.status)
              const icon = isSelected
                ? selectedIcon
                : (d.status as string) === 'STARTED'
                  ? greenIcon
                  : blueIconPulse

              return (
                <Marker
                  key={d.assignedToId!}
                  position={[loc.latitude, loc.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => handleSelectTech(d.assignedToId!, d.bookingId),
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <p className="font-semibold text-gray-900">
                        {d.assignedTo?.firstName} {d.assignedTo?.lastName}
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: color }}
                        />
                        {getDisplayStatus(d.status)}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <p>Customer: {d.booking?.customer?.firstName} {d.booking?.customer?.lastName}</p>
                        {loc.timestamp && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Updated {timeSince(loc.timestamp)}
                          </p>
                        )}
                        {loc.speed != null && (
                          <p>Speed: {(loc.speed * 3.6).toFixed(1)} km/h</p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {routePoints.length > 1 && (
              <Polyline
                positions={routePoints}
                color="#F59E0B"
                weight={3}
                opacity={0.7}
              />
            )}
          </MapContainer>

          {routeLoading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg text-sm text-gray-600 dark:text-gray-400">
              Loading route...
            </div>
          )}

          {!sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="absolute top-3 left-3 z-[1000] shadow-md bg-white dark:bg-gray-800"
            >
              <ChevronRight className="h-4 w-4 mr-1" /> Panel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}


