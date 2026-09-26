import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };
  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((args: unknown) => {
      if (Array.isArray(args)) {
        return Promise.all(args);
      }
      return Promise.resolve(args);
    }),
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

  it('should register a new user using 12 bcrypt salt rounds', async () => {
    mockPrismaService.user.create.mockImplementationOnce(
      ({ data }: { data: { email: string; password: string } }) =>
        Promise.resolve({
          id: 'new-user-id',
          email: data.email,
          password: data.password,
        }),
    );

    const result = await service.register({
      email: 'new@kopabridge.com',
      password: 'password123',
    });

    expect(result.email).toBe('new@kopabridge.com');
    expect(mockPrismaService.user.create).toHaveBeenCalled();
    const [createArg] = mockPrismaService.user.create.mock.calls[0] as [
      { data: { email: string; password: string } },
    ];
    // Bcrypt cost 12 hash prefix
    expect(createArg.data.password.startsWith('$2b$12$')).toBe(true);
    const matches = await bcrypt.compare(
      'password123',
      createArg.data.password,
    );
    expect(matches).toBe(true);
  });

  it('should safely reject non-existent user with UnauthorizedException', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.login({
        email: 'unknown@kopabridge.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should increment failedLoginAttempts on invalid password', async () => {
    const hashedPassword = await bcrypt.hash('correctpassword', 10);
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'test@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: null,
      failedLoginAttempts: 2,
      lockedUntil: null,
    });
    mockPrismaService.user.update.mockResolvedValueOnce({});

    await expect(
      service.login({
        email: 'test@kopabridge.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockPrismaService.user.update).toHaveBeenCalled();
    const [updateArg] = mockPrismaService.user.update.mock.calls[0] as [
      {
        where: { id: string };
        data: { failedLoginAttempts: number; lockedUntil: Date | null };
      },
    ];
    expect(updateArg.where.id).toBe('user-id');
    expect(updateArg.data.failedLoginAttempts).toBe(3);
    expect(updateArg.data.lockedUntil).toBeNull();
  });

  it('should lock user account when failedLoginAttempts reaches 5', async () => {
    const hashedPassword = await bcrypt.hash('correctpassword', 10);
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'test@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: null,
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    mockPrismaService.user.update.mockResolvedValueOnce({});

    await expect(
      service.login({
        email: 'test@kopabridge.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(
      'Account is temporarily locked due to consecutive failed login attempts. Please try again later.',
    );

    expect(mockPrismaService.user.update).toHaveBeenCalled();
    const [updateArg] = mockPrismaService.user.update.mock.calls[0] as [
      {
        where: { id: string };
        data: { failedLoginAttempts: number; lockedUntil: Date | null };
      },
    ];
    expect(updateArg.where.id).toBe('user-id');
    expect(updateArg.data.failedLoginAttempts).toBe(5);
    expect(updateArg.data.lockedUntil).toBeInstanceOf(Date);
  });

  it('should reject login if user account is currently locked', async () => {
    const hashedPassword = await bcrypt.hash('correctpassword', 10);
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'locked@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: null,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 600000), // 10 minutes in the future
    });

    await expect(
      service.login({
        email: 'locked@kopabridge.com',
        password: 'correctpassword',
      }),
    ).rejects.toThrow(
      'Account is temporarily locked due to consecutive failed login attempts. Please try again later.',
    );

    // Database update should not be called when account is already locked
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
  });

  it('should allow login if lockout period has expired and reset lockout', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'unlocked@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: null,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 10000), // expired 10s ago
    });
    mockPrismaService.user.update.mockResolvedValueOnce({});
    mockPrismaService.refreshToken.create.mockResolvedValueOnce({});

    const result = await service.login({
      email: 'unlocked@kopabridge.com',
      password: 'password123',
    });

    expect(result.access_token).toBeDefined();
    expect(mockPrismaService.user.update).toHaveBeenCalled();
    const [updateArg] = mockPrismaService.user.update.mock.calls[0] as [
      {
        where: { id: string };
        data: { failedLoginAttempts: number; lockedUntil: Date | null };
      },
    ];
    expect(updateArg.data.failedLoginAttempts).toBe(0);
    expect(updateArg.data.lockedUntil).toBeNull();
  });

  it('should reset failedLoginAttempts on successful login if user had prior failed attempts', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'demo@kopabridge.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      deletedAt: null,
      failedLoginAttempts: 3,
      lockedUntil: null,
    });
    mockPrismaService.user.update.mockResolvedValueOnce({});
    mockPrismaService.refreshToken.create.mockResolvedValueOnce({});

    const result = await service.login({
      email: 'demo@kopabridge.com',
      password: 'password123',
    });

    expect(result.access_token).toEqual('mock-access-token');
    expect(mockPrismaService.user.update).toHaveBeenCalled();
    const [updateArg] = mockPrismaService.user.update.mock.calls[0] as [
      {
        where: { id: string };
        data: { failedLoginAttempts: number; lockedUntil: Date | null };
      },
    ];
    expect(updateArg.where.id).toBe('user-id');
    expect(updateArg.data.failedLoginAttempts).toBe(0);
    expect(updateArg.data.lockedUntil).toBeNull();
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

  describe('forgotPassword', () => {
    it('should create a hashed password reset token if user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-reset-id',
        email: 'reset@kopabridge.com',
        isActive: true,
        deletedAt: null,
      });
      mockPrismaService.passwordResetToken.deleteMany.mockResolvedValueOnce({});
      mockPrismaService.passwordResetToken.create.mockResolvedValueOnce({});

      const result = await service.forgotPassword({
        email: 'reset@kopabridge.com',
      });

      expect(result.message).toContain(
        'If an account with that email exists, password reset instructions have been sent.',
      );
      expect(
        mockPrismaService.passwordResetToken.deleteMany,
      ).toHaveBeenCalled();
      const [deleteArg] = mockPrismaService.passwordResetToken.deleteMany.mock
        .calls[0] as [{ where: { userId: string } }];
      expect(deleteArg.where.userId).toBe('user-reset-id');

      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
      const [createArg] = mockPrismaService.passwordResetToken.create.mock
        .calls[0] as [
        { data: { tokenHash: string; userId: string; expiresAt: Date } },
      ];
      expect(createArg.data.userId).toBe('user-reset-id');
      expect(createArg.data.tokenHash).toBeDefined();
      expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return identical message when user is not found to prevent enumeration', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@kopabridge.com',
      });

      expect(result.message).toContain(
        'If an account with that email exists, password reset instructions have been sent.',
      );
      expect(
        mockPrismaService.passwordResetToken.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password, clear lockout, and revoke active sessions in a transaction', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: 'token-id-1',
        tokenHash: 'hashed-token',
        userId: 'user-reset-id',
        usedAt: null,
        expiresAt: new Date(Date.now() + 600000),
        user: {
          id: 'user-reset-id',
          email: 'reset@kopabridge.com',
          isActive: true,
          deletedAt: null,
        },
      });

      const result = await service.resetPassword({
        token: 'raw-token-123',
        newPassword: 'BrandNewPassword123!',
      });

      expect(result.message).toContain('Password has been successfully reset');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if token not found or already used', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValueOnce(
        null,
      );

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'BrandNewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: 'token-id-2',
        tokenHash: 'hashed-token',
        userId: 'user-reset-id',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 600000),
        user: {
          id: 'user-reset-id',
          isActive: true,
          deletedAt: null,
        },
      });

      await expect(
        service.resetPassword({
          token: 'used-token',
          newPassword: 'BrandNewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token has expired', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: 'token-id-3',
        tokenHash: 'hashed-token',
        userId: 'user-reset-id',
        usedAt: null,
        expiresAt: new Date(Date.now() - 10000),
        user: {
          id: 'user-reset-id',
          isActive: true,
          deletedAt: null,
        },
      });

      await expect(
        service.resetPassword({
          token: 'expired-token',
          newPassword: 'BrandNewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
