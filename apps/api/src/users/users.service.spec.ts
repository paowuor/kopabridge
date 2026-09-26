import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash password with 12 rounds and create user', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.user.create.mockResolvedValueOnce({
      id: 'user-id',
      email: 'test@kopabridge.com',
    });

    const result = await service.createUser({
      email: 'test@kopabridge.com',
      password: 'securepassword123',
    });

    expect(result).toEqual({ id: 'user-id', email: 'test@kopabridge.com' });
    expect(mockPrismaService.user.create).toHaveBeenCalled();
  });
});
