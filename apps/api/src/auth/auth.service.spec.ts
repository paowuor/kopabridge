import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };
  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
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

  it('should login a user and return an access token', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'user-id',
      email: 'demo@kopabridge.com',
      password: hashedPassword,
      role: 'user',
    });

    const result = await service.login({
      email: 'demo@kopabridge.com',
      password: 'password123',
    });

    expect(result).toEqual({ access_token: 'mock-token' });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'demo@kopabridge.com',
      role: 'user',
    });
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
});
