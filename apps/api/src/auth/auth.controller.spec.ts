import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockRequest = {
    headers: { 'user-agent': 'Jest-Agent' },
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call register on authService', async () => {
    const dto = { email: 'test@kopabridge.com', password: 'password123' };
    mockAuthService.register.mockResolvedValueOnce({
      id: 'user-id',
      email: dto.email,
    });

    const result = await controller.register(dto);
    expect(result).toEqual({ id: 'user-id', email: dto.email });
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('should call login on authService with request metadata', async () => {
    const dto = { email: 'test@kopabridge.com', password: 'password123' };
    mockAuthService.login.mockResolvedValueOnce({
      access_token: 'mock-access',
      refresh_token: 'mock-refresh',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const result = await controller.login(dto, mockRequest);
    expect(result.access_token).toEqual('mock-access');
    expect(mockAuthService.login).toHaveBeenCalledWith(dto, {
      userAgent: 'Jest-Agent',
      ipAddress: '127.0.0.1',
    });
  });

  it('should call refresh on authService with token and metadata', async () => {
    const dto = { refreshToken: 'valid-refresh-token' };
    mockAuthService.refresh.mockResolvedValueOnce({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const result = await controller.refresh(dto, mockRequest);
    expect(result.access_token).toEqual('new-access');
    expect(mockAuthService.refresh).toHaveBeenCalledWith(dto.refreshToken, {
      userAgent: 'Jest-Agent',
      ipAddress: '127.0.0.1',
    });
  });

  it('should call logout on authService', async () => {
    const dto = { refreshToken: 'token-to-logout' };
    mockAuthService.logout.mockResolvedValueOnce({
      status: 'success',
      message: 'Session successfully terminated.',
    });

    const result = await controller.logout(dto);
    expect(result.status).toEqual('success');
    expect(mockAuthService.logout).toHaveBeenCalledWith('token-to-logout');
  });
});
