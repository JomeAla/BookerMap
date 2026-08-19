import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HoneypotService } from './honeypot.service';

export const TRAP_FIELDS = ['website_url', 'website', 'homepage', 'fax'] as const;

export function getClientIp(req: Request): string {
  return (req.ips && req.ips.length ? req.ips[0] : req.ip) || 'unknown';
}

@Injectable()
export class HoneypotMiddleware implements NestMiddleware {
  constructor(private readonly honeypotService: HoneypotService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);

    if (await this.honeypotService.isBlocked(ip)) {
      this.recordSuspiciousPattern(ip, req).catch(() => undefined);
      throw new ForbiddenException('Access denied');
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const trapField = TRAP_FIELDS.find((f) => {
      const value = body[f];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });

    if (trapField) {
      await this.honeypotService.recordHit({
        ip,
        trapType: 'TRAP_FIELD',
        field: trapField,
        path: req.path,
        userAgent: req.headers['user-agent'] as string | undefined,
        referer: req.headers.referer as string | undefined,
        requestBody: body,
      });
      res.status(200).json({ success: true });
      return;
    }

    next();
  }

  private recordSuspiciousPattern(ip: string, req: Request) {
    return this.honeypotService.recordHit({
      ip,
      trapType: 'SUSPICIOUS_PATTERN',
      path: req.path,
      userAgent: req.headers['user-agent'] as string | undefined,
      referer: req.headers.referer as string | undefined,
    });
  }
}