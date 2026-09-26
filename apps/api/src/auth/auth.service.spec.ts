import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };
  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should login a user and return access and refresh tokens', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'demo@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: null,
    });
    mockPrismaService.refreshToken.create.mockResolvedValueOnce({});

    const result = await service.login({
      email: 'demo@kopabridge.com',
      password: 'password123',
    });

    expect(result.access_token).toEqual('mock-access-token');
    expect(result.refresh_token).toBeDefined();
    expect(result.token_type).toEqual('Bearer');
    expect(result.expires_in).toEqual(900);
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'demo@kopabridge.com',
      role: 'user',
    });
    expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.login({
        email: 'bad@kopabridge.com',
        password: 'badpassword',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is deactivated or soft-deleted', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Deactivated user
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'deactivated@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: false,
      deletedAt: null,
    });

    await expect(
      service.login({
        email: 'deactivated@kopabridge.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // Soft-deleted user
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id-2',
      email: 'deleted@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: new Date(),
    });

    await expect(
      service.login({
        email: 'deleted@kopabridge.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should rotate and refresh token when valid refresh token is presented', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-id-1',
      tokenHash: 'hashed',
      userId: 'user-id',
      family: 'family-uuid-1',
      revoked: false,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'user-id',
        email: 'demo@kopabridge.com',
        role: 'user',
        isActive: true,
        deletedAt: null,
      },
    });
    mockPrismaService.refreshToken.update.mockResolvedValueOnce({});
    mockPrismaService.refreshToken.create.mockResolvedValueOnce({});

    const result = await service.refresh('raw-refresh-token-1');

    expect(result.access_token).toEqual('mock-access-token');
    expect(result.refresh_token).toBeDefined();
    expect(result.expires_in).toEqual(900);

    // Check old token was revoked
    expect(mockPrismaService.refreshToken.update).toHaveBeenCalled();
    const updateArgs = (
      mockPrismaService.refreshToken.update.mock.calls as Array<
        [{ where: { id: string }; data: { revoked: boolean } }]
      >
    )[0][0];
    expect(updateArgs.where.id).toBe('token-id-1');
    expect(updateArgs.data.revoked).toBe(true);

    // Check new token created under same family
    expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    const createArgs = (
      mockPrismaService.refreshToken.create.mock.calls as Array<
        [{ data: { family: string; userId: string } }]
      >
    )[0][0];
    expect(createArgs.data.family).toBe('family-uuid-1');
    expect(createArgs.data.userId).toBe('user-id');
  });

  it('should detect reuse of revoked token and invalidate entire token family', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'compromised-token-id',
      tokenHash: 'hashed',
      userId: 'user-id',
      family: 'family-uuid-compromised',
      revoked: true,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'user-id',
        email: 'demo@kopabridge.com',
        role: 'user',
      },
    });

    await expect(service.refresh('replayed-compromised-token')).rejects.toThrow(
      UnauthorizedException,
    );

    // Entire family must be revoked
    expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
    const reuseArgs = (
      mockPrismaService.refreshToken.updateMany.mock.calls as Array<
        [{ where: { family: string }; data: { revoked: boolean } }]
      >
    )[0][0];
    expect(reuseArgs.where.family).toBe('family-uuid-compromised');
    expect(reuseArgs.data.revoked).toBe(true);
  });

  it('should throw UnauthorizedException if refresh token is expired', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'expired-token-id',
      tokenHash: 'hashed',
      userId: 'user-id',
      family: 'family-uuid-expired',
      revoked: false,
      expiresAt: new Date(Date.now() - 100000),
      user: {
        id: 'user-id',
        email: 'demo@kopabridge.com',
        role: 'user',
      },
    });

    await expect(service.refresh('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should revoke token family on logout', async () => {
    mockPrismaService.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'logout-token-id',
      family: 'family-to-logout',
    });

    const result = await service.logout('token-to-logout');

    expect(result.status).toEqual('success');
    expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
    const logoutArgs = (
      mockPrismaService.refreshToken.updateMany.mock.calls as Array<
        [{ where: { family: string }; data: { revoked: boolean } }]
      >
    )[0][0];
    expect(logoutArgs.where.family).toBe('family-to-logout');
    expect(logoutArgs.data.revoked).toBe(true);
  });
});
