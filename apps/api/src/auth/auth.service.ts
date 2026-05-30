import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notification/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${dto.tenantSlug}" not found`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'OWNER',
        tenantId: tenant.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (user.twoFactorEnabled) {
      return { twoFactorRequired: true, userId: user.id };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: existingToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!existingToken.user.isActive) {
      await this.prisma.refreshToken.delete({ where: { id: existingToken.id } });
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.refreshToken.delete({ where: { id: existingToken.id } });

    const tokens = await this.generateTokens(
      existingToken.user.id,
      existingToken.user.email,
      existingToken.user.tenantId,
      existingToken.user.role,
    );

    return tokens;
  }

  async logout(refreshToken: string) {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (existing) {
      await this.prisma.refreshToken.delete({ where: { id: existing.id } });
    }

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Click the link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.header{background:#3B82F6;color:#fff;padding:20px;text-align:center}.content{padding:20px}.footer{padding:20px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee}</style></head><body><div class="header"><h2>Password Reset</h2></div><div class="content"><p>Hi <strong>${user.firstName}</strong>,</p><p>You requested a password reset. Click the button below to reset your password.</p><div style="text-align:center;margin:24px 0"><a href="${resetUrl}" style="background:#3B82F6;color:#fff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block">Reset Password</a></div><p>This link expires in 1 hour.</p><p>If you did not request this, please ignore this email.</p></div><div class="footer"><p>BookerMap Security Team</p></div></body></html>`;

    await this.emailService.sendMail({ to: email, subject, text, html });

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async findOrCreateOAuthUser(data: { email: string; firstName: string; lastName: string; picture: string | null; provider: string; providerId: string }) {
    let user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
      return { ...user, ...tokens };
    }

    user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'OWNER' as any,
        passwordHash: '',
        emailVerified: true,
        tenantId: '',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
    return { ...user, ...tokens };
  }

  async generateTokens(userId: string, email: string, tenantId: string, role: string) {
    const payload = { sub: userId, email, tenantId, role };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    let expiresAt: Date;
    const match = refreshTokenExpiresIn.match(/^(\d+)([dhms])$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2];
      const now = new Date();
      switch (unit) {
        case 'd': expiresAt = new Date(now.getTime() + num * 86400000); break;
        case 'h': expiresAt = new Date(now.getTime() + num * 3600000); break;
        case 'm': expiresAt = new Date(now.getTime() + num * 60000); break;
        case 's': expiresAt = new Date(now.getTime() + num * 1000); break;
        default: expiresAt = new Date(now.getTime() + 7 * 86400000);
      }
    } else {
      expiresAt = new Date(Date.now() + 7 * 86400000);
    }

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        expiresAt,
        userId,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }
}
