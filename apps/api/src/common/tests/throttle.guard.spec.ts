import { ThrottleBehindProxyGuard } from '../guards/throttle.guard';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';

describe('ThrottleBehindProxyGuard', () => {
  let guard: ThrottleBehindProxyGuard;
  let reflector: Reflector;
  let storage: ThrottlerStorage;
  let options: ThrottlerModuleOptions;

  const mockStorage: ThrottlerStorage = {
    increment: jest.fn().mockResolvedValue({ totalHits: 1, timeToExpire: 60 }),
  } as any;

  beforeEach(async () => {
    reflector = new Reflector();
    storage = mockStorage;
    options = { throttlers: [{ limit: 10, ttl: 60000 }] };
    guard = new ThrottleBehindProxyGuard(options, storage, reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return the first IP from req.ips if available', async () => {
      const req = { ips: ['192.168.1.1', '10.0.0.1'], ip: '127.0.0.1' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('192.168.1.1');
    });

    it('should fall back to req.ip if req.ips is empty', async () => {
      const req = { ips: [], ip: '10.0.0.1' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('10.0.0.1');
    });

    it('should fall back to req.ip if req.ips is undefined', async () => {
      const req = { ip: '10.0.0.1' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('10.0.0.1');
    });
  });
});
