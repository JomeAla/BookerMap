import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../notification/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let emailService: any;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return 'test-value';
    }),
  };

  const mockEmailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
      tenantSlug: 'test-business',
    };

    it('should register a new user', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', slug: 'test-business' });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'OWNER',
        tenantId: 'tenant-1',
        isActive: true,
        createdAt: new Date(),
        phone: null,
      });

      const result = await service.register(dto);

      expect(result.email).toBe(dto.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tenant slug not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.register(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', slug: 'test-business' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Password123' };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'OWNER',
        tenantId: 'tenant-1',
        isActive: true,
        twoFactorEnabled: false,
      });

      const result = await service.login(loginDto) as any;

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe(loginDto.email);
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: await bcrypt.hash('different', 10),
        firstName: 'John',
        lastName: 'Doe',
        role: 'OWNER',
        tenantId: 'tenant-1',
        isActive: true,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        passwordHash: await bcrypt.hash('Password123', 10),
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        tenantId: 'tenant-1',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ resetToken: expect.any(String), resetTokenExpiresAt: expect.any(Date) }),
        }),
      );
      expect(mockEmailService.sendMail).toHaveBeenCalled();
    });

    it('should return generic message for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(mockEmailService.sendMail).not.toHaveBeenCalled();
    });
  });
});
