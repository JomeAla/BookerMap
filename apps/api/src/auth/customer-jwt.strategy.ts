import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
    });
  }

  async validate(payload: { sub: string; tenantId: string; role: string; type?: string }) {
    if (payload.type !== 'customer' || payload.role !== 'CUSTOMER') {
      throw new UnauthorizedException();
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, tenantId: true },
    });
    if (!customer) throw new UnauthorizedException();

    return {
      id: customer.id,
      email: customer.email,
      phone: customer.phone,
      role: 'CUSTOMER',
      tenantId: customer.tenantId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      customer: true,
    };
  }
}