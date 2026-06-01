import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid Authorization header format. Use: Bearer bmap_xxx');
    }

    const apiKey = parts[1];
    if (!apiKey.startsWith('bmap_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    let keyData: any;
    try {
      keyData = await this.apiKeyService.validateKey(apiKey);
    } catch {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    const requiredScopes = this.reflector.getAllAndOverride<string[]>('scopes', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScopes?.length) {
      const keyScopes = keyData.scopes as string[];
      const hasScope = requiredScopes.some((s) => keyScopes.includes(s));
      if (!hasScope) {
        throw new ForbiddenException('API key does not have the required scope');
      }
    }

    request.apiKey = {
      keyId: keyData.id,
      tenantId: keyData.tenantId,
      scopes: keyData.scopes,
      rateLimit: keyData.rateLimit,
    };

    return true;
  }
}
