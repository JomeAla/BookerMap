import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID || 'placeholder',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'placeholder',
      callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/microsoft/callback',
      scope: ['user.read'],
      tenant: 'common',
    } as any);
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const user = await this.authService.findOrCreateOAuthUser({
      email: profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName,
      firstName: profile.name?.givenName || profile.displayName || '',
      lastName: profile.name?.familyName || '',
      picture: null,
      provider: 'microsoft',
      providerId: profile.id,
    });
    done(null, user);
  }
}
