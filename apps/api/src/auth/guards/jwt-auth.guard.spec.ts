import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let superCanActivate: jest.SpyInstance;

  const handler = () => undefined;
  const controllerClass = class {};

  const buildContext = (): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    // AuthGuard.canActivate delegates to Passport, which needs a real request;
    // stub it so these tests assert only the @Public() opt-out branch.
    superCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('reads the same metadata key that @Public() writes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    void guard.canActivate(buildContext());

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      controllerClass,
    ]);
  });

  it('skips authentication for a @Public() route', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(buildContext())).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('authenticates a route with no @Public() marker (default deny)', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    void guard.canActivate(buildContext());

    expect(superCanActivate).toHaveBeenCalledTimes(1);
  });

  it('authenticates a route whose @Public() marker is absent', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    void guard.canActivate(buildContext());

    expect(superCanActivate).toHaveBeenCalledTimes(1);
  });

  it('propagates a 401 raised by Passport for a protected route', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    superCanActivate.mockImplementation(() => {
      throw new UnauthorizedException();
    });

    expect(() => guard.canActivate(buildContext())).toThrow(
      UnauthorizedException,
    );
  });
});
