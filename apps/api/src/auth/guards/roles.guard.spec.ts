import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../roles/roles.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const handler = () => undefined;
  const controllerClass = class {};

  const buildContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => controllerClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('reads the same metadata key that @Roles() writes', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    guard.canActivate(buildContext({ role: Role.USER }));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      controllerClass,
    ]);
  });

  it('allows the request when the route declares no roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('allows a user holding one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(
      guard.canActivate(buildContext({ userId: 'u1', role: Role.ADMIN })),
    ).toBe(true);
  });

  it('denies a user whose role is not required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(buildContext({ userId: 'u1', role: Role.USER })),
    ).toThrow(ForbiddenException);
  });

  it('does not grant access on a mere prefix match of the role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(buildContext({ userId: 'u1', role: 'administrator' })),
    ).toThrow(ForbiddenException);
  });

  it('denies when session data is missing entirely', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when the role claim is not a string', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(buildContext({ userId: 'u1', role: ['admin'] })),
    ).toThrow(ForbiddenException);
  });

  it('denies the PROVIDER role on an ADMIN-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(buildContext({ userId: 'u1', role: Role.PROVIDER })),
    ).toThrow(ForbiddenException);
  });

  it('does not disclose the required role in the denial message', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(buildContext({ userId: 'u1', role: Role.USER })),
    ).toThrow(/insufficient role/i);
  });
});
