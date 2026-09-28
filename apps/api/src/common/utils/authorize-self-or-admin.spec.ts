import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/roles/roles.enum';
import { assertSelfOrAdmin } from './authorize-self-or-admin';

describe('assertSelfOrAdmin', () => {
  const owner: AuthenticatedUser = {
    userId: 'user-1',
    email: 'owner@example.com',
    role: Role.USER,
  };

  it('allows a user to access their own resource', () => {
    expect(() => assertSelfOrAdmin(owner, 'user-1')).not.toThrow();
  });

  it('allows an admin to access another user resource', () => {
    const admin: AuthenticatedUser = { ...owner, role: Role.ADMIN };

    expect(() => assertSelfOrAdmin(admin, 'user-1')).not.toThrow();
  });

  it('denies a user accessing someone else resource', () => {
    expect(() => assertSelfOrAdmin(owner, 'user-2')).toThrow(
      ForbiddenException,
    );
  });

  it('denies when no session is present', () => {
    expect(() => assertSelfOrAdmin(undefined, 'user-1')).toThrow(
      ForbiddenException,
    );
  });

  it('denies a user with a missing userId, even for a blank target', () => {
    expect(() => assertSelfOrAdmin({ role: Role.USER }, 'user-1')).toThrow(
      ForbiddenException,
    );
  });

  it('does not treat a missing role as admin', () => {
    expect(() => assertSelfOrAdmin({ userId: 'user-1' }, 'user-2')).toThrow(
      ForbiddenException,
    );
  });

  it('denies a PROVIDER role user accessing another user resource', () => {
    const provider: AuthenticatedUser = { ...owner, role: Role.PROVIDER };

    expect(() => assertSelfOrAdmin(provider, 'user-2')).toThrow(
      ForbiddenException,
    );
  });

  it('does not disclose resource ownership in the denial message', () => {
    expect(() => assertSelfOrAdmin(owner, 'user-2')).toThrow(
      /you may only access your own resources/i,
    );
  });
});
