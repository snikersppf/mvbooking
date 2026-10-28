import { UserRole, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  requireCurrentUser,
  requireCurrentUserFromIdentity,
} from '@/server/auth/current-user';
import {
  AuthenticationRequiredError,
  AuthInfrastructureError,
  ForbiddenError,
} from '@/server/auth/errors';
import { requireRole } from '@/server/auth/guards';
import type {
  AuthorizationUser,
  UserRepository,
} from '@/server/repositories/users';

const activeUser: AuthorizationUser = {
  id: 'user_1',
  name: 'Customer',
  email: 'customer@example.com',
  phone: null,
  role: UserRole.CUSTOMER,
  status: UserStatus.ACTIVE,
  sessionVersion: 4,
};

function createRepository(
  user: AuthorizationUser | null = activeUser,
): UserRepository {
  return {
    findAuthorizationUserById: vi.fn().mockResolvedValue(user),
    findCredentialsUserByEmail: vi.fn().mockResolvedValue(null),
    createCustomer: vi.fn(),
  };
}

function createSessionReader(sessionVersion = 4, mfaVerified = false) {
  return vi.fn().mockResolvedValue({
    expires: '2026-11-09T00:00:00.000Z',
    user: {
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      image: null,
      role: activeUser.role,
      sessionVersion,
      mfaVerified,
    },
  });
}
describe('requireCurrentUser', () => {
  it('returns the current database user for a matching active session', async () => {
    const repository = createRepository();

    await expect(
      requireCurrentUser(repository, createSessionReader()),
    ).resolves.toEqual(activeUser);
    expect(repository.findAuthorizationUserById).toHaveBeenCalledWith(
      activeUser.id,
    );
  });

  it.each([
    null,
    { userId: '', sessionVersion: 4 },
    { userId: activeUser.id, sessionVersion: 1.5 },
  ])('rejects an invalid session identity: %o', async (identity) => {
    const repository = createRepository();

    await expect(
      requireCurrentUserFromIdentity(identity, repository),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
    expect(repository.findAuthorizationUserById).not.toHaveBeenCalled();
  });

  it('rejects missing, inactive, and stale users', async () => {
    await expect(
      requireCurrentUserFromIdentity(
        { userId: activeUser.id, sessionVersion: 4 },
        createRepository(null),
      ),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);

    await expect(
      requireCurrentUserFromIdentity(
        { userId: activeUser.id, sessionVersion: 4 },
        createRepository({
          ...activeUser,
          status: UserStatus.SUSPENDED,
        }),
      ),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);

    await expect(
      requireCurrentUserFromIdentity(
        { userId: activeUser.id, sessionVersion: 3 },
        createRepository(),
      ),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it('maps repository failures to an infrastructure error', async () => {
    const repository = createRepository();
    vi.mocked(repository.findAuthorizationUserById).mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(
      requireCurrentUserFromIdentity(
        { userId: activeUser.id, sessionVersion: 4 },
        repository,
      ),
    ).rejects.toBeInstanceOf(AuthInfrastructureError);
  });

  it('maps auth() failures to an infrastructure error', async () => {
    const sessionReader = vi.fn().mockRejectedValue(
      new Error('session unavailable'),
    );

    await expect(
      requireCurrentUser(createRepository(), sessionReader),
    ).rejects.toBeInstanceOf(AuthInfrastructureError);
  });
});

describe('requireRole', () => {
  it('authorizes using the current role loaded from the database', async () => {
    const repository = createRepository({
      ...activeUser,
      role: UserRole.ADMIN,
      totpEnabledAt: new Date(),
    });

    await expect(
      requireRole([UserRole.ADMIN], repository, createSessionReader(4, true)),
    ).resolves.toMatchObject({ role: UserRole.ADMIN });
  });

  it('rejects a current user without an allowed role', async () => {
    await expect(
      requireRole(
        [UserRole.ADMIN],
        createRepository(),
        createSessionReader(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

it("refuses staff access from a password-only session or disabled DB factor", async () => {
  const staff = { ...activeUser, role: UserRole.ADMIN, totpEnabledAt: new Date() };
  const passwordOnly = vi.fn().mockResolvedValue({ user: { id: activeUser.id, sessionVersion: 4 } });
  await expect(requireRole([UserRole.ADMIN], createRepository(staff), passwordOnly)).rejects.toBeInstanceOf(AuthenticationRequiredError);
  await expect(requireRole([UserRole.ADMIN], createRepository({ ...staff, totpEnabledAt: null }), createSessionReader(4, true))).rejects.toBeInstanceOf(AuthenticationRequiredError);
});
