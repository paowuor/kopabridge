import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../roles/roles.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  const activeUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: Role.USER,
    isActive: true,
    deletedAt: null,
  };

  const payload = {
    sub: 'user-1',
    email: 'stale@example.com',
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('returns the account resolved from the database', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: 'user-1',
      email: 'user@example.com',
      role: Role.USER,
    });
  });

  it('uses the current database role, not the role claim in the token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      role: Role.USER,
    });

    // The token claims ADMIN; a demotion must take effect immediately.
    const user = await strategy.validate({ ...payload, role: Role.ADMIN });

    expect(user.role).toBe(Role.USER);
  });

  it('looks the account up by the token subject', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);

    await strategy.validate(payload);

    const [call] = prisma.user.findUnique.mock.calls[0] as [
      { where: { id: string }; select: Record<string, boolean> },
    ];
    expect(call.where.id).toBe('user-1');
    // Only the columns the guard needs, so the per-request cost stays low.
    expect(call.select).toMatchObject({
      id: true,
      email: true,
      role: true,
      isActive: true,
      deletedAt: true,
    });
  });

  it('rejects a token whose account no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a deactivated account before its token expires', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a soft-deleted account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date(),
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
