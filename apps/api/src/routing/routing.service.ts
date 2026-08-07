import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface RouteStop {
  lat: number;
  lng: number;
  label?: string;
}

interface OptimizedRoute {
  orderedStops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  waypoints: { lat: number; lng: number }[];
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly OSRM_BASE = 'https://router.project-osrm.org';

  async optimizeRoute(stops: RouteStop[], origin?: RouteStop): Promise<OptimizedRoute> {
    if (stops.length < 2) {
      return {
        orderedStops: stops,
        totalDistance: 0,
        totalDuration: 0,
        waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      };
    }

    const allStops = origin ? [origin, ...stops] : stops;
    const coords = allStops.map((s) => `${s.lng},${s.lat}`).join(';');

    try {
      const response = await axios.get(`${this.OSRM_BASE}/trip/v1/driving/${coords}`, {
        params: {
          steps: 'false',
          overview: 'false',
          source: origin ? 'first' : 'any',
          roundtrip: false,
        },
        timeout: 10000,
      });

      const waypoints = response.data.waypoints
        .filter((wp: any) => wp && wp.location)
        .map((wp: any) => ({ lat: wp.location[1], lng: wp.location[0] }));

      const orderedStops = waypoints.length > 0
        ? waypoints.map((wp: { lat: number; lng: number }) => {
            const match = allStops.find(
              (s) => Math.abs(s.lat - wp.lat) < 0.001 && Math.abs(s.lng - wp.lng) < 0.001,
            );
            return match || { lat: wp.lat, lng: wp.lng };
          })
        : allStops;

      const trip = response.data.trips?.[0];
      return {
        orderedStops: origin ? orderedStops.slice(1) : orderedStops,
        totalDistance: trip?.distance || 0,
        totalDuration: trip?.duration || 0,
        waypoints,
      };
    } catch (error: any) {
      this.logger.error(`OSRM routing failed: ${error.message}`);
      return {
        orderedStops: stops,
        totalDistance: 0,
        totalDuration: 0,
        waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      };
    }
  }

  async getDriveTime(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<number> {
    try {
      const response = await axios.get(
        `${this.OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
        { params: { overview: 'false' }, timeout: 5000 },
      );
      return response.data.routes?.[0]?.duration || 0;
    } catch {
      return 0;
    }
  }

  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<{
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    steps: {
      instruction: string;
      name: string;
      distance: number;
      duration: number;
      maneuver: string;
      modifier?: string;
      location: [number, number];
    }[];
  }> {
    try {
      const response = await axios.get(
        `${this.OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
        {
          params: { overview: 'full', steps: 'true', geometries: 'geojson' },
          timeout: 10000,
        },
      );

      const route = response.data.routes?.[0];
      if (!route) {
        return {
          distance: 0,
          duration: 0,
          geometry: { type: 'LineString', coordinates: [] },
          steps: [],
        };
      }

      const steps = (route.legs?.[0]?.steps || []).map((s: any) => ({
        instruction: this.formatStepInstruction(s.maneuver, s.name, s.destinations),
        name: s.name || '',
        distance: s.distance || 0,
        duration: s.duration || 0,
        maneuver: s.maneuver?.type || '',
        modifier: s.maneuver?.modifier,
        location: s.maneuver?.location || [0, 0],
      }));

      return {
        distance: route.distance || 0,
        duration: route.duration || 0,
        geometry: route.geometry || { type: 'LineString', coordinates: [] },
        steps,
      };
    } catch (error: any) {
      this.logger.error(`OSRM getRoute failed: ${error.message}`);
      return {
        distance: 0,
        duration: 0,
        geometry: { type: 'LineString', coordinates: [] },
        steps: [],
      };
    }
  }

  private formatStepInstruction(maneuver: any, name: string, destinations?: string): string {
    const type = maneuver?.type || '';
    const modifier = maneuver?.modifier || '';
    const road = name || destinations || '';
    const destSuffix = destinations && name ? ` toward ${destinations}` : '';

    if (type === 'depart') return `Head ${modifier} on ${road || 'current road'}`.replace(' on ', road ? ' on ' : '');
    if (type === 'arrive') return `Arrive at ${road || 'your destination'}`;
    if (type === 'turn') return `Turn ${modifier} onto ${road}${destSuffix}`;
    if (type === 'new name') return `Continue onto ${road}${destSuffix}`;
    if (type === 'merge') return `Merge ${modifier} onto ${road}${destSuffix}`;
    if (type === 'on ramp') return `Take the ramp ${modifier} onto ${road}${destSuffix}`;
    if (type === 'off ramp') return `Take the exit ${modifier} onto ${road}${destSuffix}`;
    if (type === 'fork') return `Keep ${modifier} at the fork${road ? ` onto ${road}` : ''}`;
    if (type === 'end of road') return `Turn ${modifier} at the end of the road${road && road !== name ? '' : road ? ` onto ${road}` : ''}`;
    if (type === 'continue') return `Continue ${modifier} on ${road}${destSuffix}`;
    if (type === 'roundabout') return `Enter the roundabout${road ? ` and exit toward ${road}` : ''}`;
    if (type === 'rotary') return `Enter the rotary${road ? ` and exit toward ${road}` : ''}`;
    if (type === 'roundabout turn') return `At the roundabout, turn ${modifier} onto ${road}`;
    if (type === 'exit roundabout') return `Exit the roundabout onto ${road}`;
    if (type === 'exit rotary') return `Exit the rotary onto ${road}`;
    return `${type} ${modifier} ${road}`.trim();
  }
}
