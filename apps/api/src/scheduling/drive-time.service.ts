import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DriveTimeService {
  private readonly logger = new Logger(DriveTimeService.name);
  private readonly AVG_SPEED_KMH = 30;

  async calculateTravelTime(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<number> {
    const distance = this.haversineDistance(origin, destination);
    const minutes = Math.ceil((distance / this.AVG_SPEED_KMH) * 60);
    this.logger.log(`[DRIVE TIME] ${distance.toFixed(1)}km → ${minutes}min`);
    return Math.max(minutes, 5);
  }

  private haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aVal = sinDLat * sinDLat + sinDLat * sinDLng * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}