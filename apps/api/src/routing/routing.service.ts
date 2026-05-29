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
}
