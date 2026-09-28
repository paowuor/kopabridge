import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockRequest = {
    headers: { 'user-agent': 'Jest-Agent' },
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockCookie = jest.fn();
  const mockClearCookie = jest.fn();
  const mockResponse = {
    cookie: mockCookie,
    clearCookie: mockClearCookie,
  } as unknown as Response;

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

  it('should call forgotPassword on authService', async () => {
    const dto = { email: 'reset@kopabridge.com' };
    mockAuthService.forgotPassword.mockResolvedValueOnce({
      message:
        'If an account with that email exists, password reset instructions have been sent.',
    });

    const result = await controller.forgotPassword(dto);
    expect(result.message).toContain(
      'password reset instructions have been sent',
    );
    expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('should call resetPassword on authService', async () => {
    const dto = {
      token: 'raw-token-123',
      newPassword: 'BrandNewPassword123!',
    };
    mockAuthService.resetPassword.mockResolvedValueOnce({
      message:
        'Password has been successfully reset. Please log in with your new password.',
    });

    const result = await controller.resetPassword(dto);
    expect(result.message).toContain('Password has been successfully reset');
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('should set refresh token in HttpOnly cookie on login when response is provided', async () => {
    const dto = { email: 'test@kopabridge.com', password: 'password123' };
    mockAuthService.login.mockResolvedValueOnce({
      access_token: 'mock-access',
      refresh_token: 'cookie-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    await controller.login(dto, mockRequest, mockResponse);

    expect(mockCookie).toHaveBeenCalled();
    const [cookieName, cookieVal, cookieOpts] = mockCookie.mock.calls[0] as [
      string,
      string,
      { httpOnly: boolean; path: string },
    ];
    expect(cookieName).toBe('kopabridge_refresh_token');
    expect(cookieVal).toBe('cookie-refresh-token');
    expect(cookieOpts.httpOnly).toBe(true);
    expect(cookieOpts.path).toBe('/api/v1/auth');
  });

  it('should refresh token using cookie when body refreshToken is not provided', async () => {
    const requestWithCookie = {
      headers: { 'user-agent': 'Jest-Agent' },
      ip: '127.0.0.1',
      cookies: { kopabridge_refresh_token: 'token-from-cookie' },
    } as unknown as Request;

    mockAuthService.refresh.mockResolvedValueOnce({
      access_token: 'rotated-access',
      refresh_token: 'rotated-cookie-refresh',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const result = await controller.refresh(
      {},
      requestWithCookie,
      mockResponse,
    );

    expect(result.access_token).toBe('rotated-access');
    expect(mockAuthService.refresh).toHaveBeenCalledWith('token-from-cookie', {
      userAgent: 'Jest-Agent',
      ipAddress: '127.0.0.1',
    });
    expect(mockCookie).toHaveBeenCalled();
    const [cookieName, cookieVal] = mockCookie.mock.calls[0] as [
      string,
      string,
    ];
    expect(cookieName).toBe('kopabridge_refresh_token');
    expect(cookieVal).toBe('rotated-cookie-refresh');
  });

  it('should clear refresh token cookie on logout', async () => {
    mockAuthService.logout.mockResolvedValueOnce({
      status: 'success',
      message: 'Session successfully terminated.',
    });

    await controller.logout({}, mockRequest, mockResponse);

    expect(mockClearCookie).toHaveBeenCalled();
    const [cookieName, clearOpts] = mockClearCookie.mock.calls[0] as [
      string,
      { httpOnly: boolean; path: string },
    ];
    expect(cookieName).toBe('kopabridge_refresh_token');
    expect(clearOpts.httpOnly).toBe(true);
    expect(clearOpts.path).toBe('/api/v1/auth');
  });
});
