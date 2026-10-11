import { UserRole, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  DuplicateUserEmailError,
  type PublicUser,
  type UserRepository,
} from '@/server/repositories/users';
import {
  registerUser,
  RegistrationConflictError,
  RegistrationValidationError,
} from '@/server/services/users/register-user';
import { registrationSchema } from '@/server/validators/auth';

const createdUser: PublicUser = {
  id: 'user_1',
  name: 'Nino Beridze',
  email: 'nino@example.com',
  phone: '+995555123456',
  role: UserRole.CUSTOMER,
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-10-09T00:00:00.000Z'),
};

function createRepository(): UserRepository {
  return {
    findAuthorizationUserById: vi.fn().mockResolvedValue(null),
    findCredentialsUserByEmail: vi.fn().mockResolvedValue(null),
    createCustomer: vi.fn().mockResolvedValue(createdUser),
  };
}

describe('registrationSchema', () => {
  it('normalizes the email and trims safe profile fields', () => {
    const result = registrationSchema.parse({
      name: '  Nino Beridze  ',
      email: '  NINO@Example.COM ',
      phone: ' +995555123456 ',
      password: 'correct horse battery staple',
    });

    expect(result).toEqual({
      name: 'Nino Beridze',
      email: 'nino@example.com',
      phone: '+995555123456',
      password: 'correct horse battery staple',
    });
  });

  it('rejects short passwords and client-supplied roles', () => {
    expect(
      registrationSchema.safeParse({
        name: 'Nino',
        email: 'nino@example.com',
        password: 'too-short',
      }).success,
    ).toBe(false);

    expect(
      registrationSchema.safeParse({
        name: 'Nino',
        email: 'nino@example.com',
        password: 'long-enough-password',
        role: 'ADMIN',
      }).success,
    ).toBe(false);
  });
});

describe('registerUser', () => {
  it('hashes the password and sends only customer profile data to the repository', async () => {
    const repository = createRepository();
    const passwordHasher = vi.fn().mockResolvedValue('encoded-password-hash');

    await expect(
      registerUser(
        {
          name: ' Nino Beridze ',
          email: 'NINO@EXAMPLE.COM',
          phone: '+995555123456',
          password: 'correct horse battery staple',
        },
        { repository, passwordHasher },
      ),
    ).resolves.toEqual(createdUser);

    expect(passwordHasher).toHaveBeenCalledWith(
      'correct horse battery staple',
    );
    expect(repository.createCustomer).toHaveBeenCalledWith({
      name: 'Nino Beridze',
      email: 'nino@example.com',
      phone: '+995555123456',
      passwordHash: 'encoded-password-hash',
    });
  });

  it('rejects invalid input before password hashing', async () => {
    const repository = createRepository();
    const passwordHasher = vi.fn();

    await expect(
      registerUser(
        {
          name: 'Nino',
          email: 'nino@example.com',
          password: 'short',
        },
        { repository, passwordHasher },
      ),
    ).rejects.toBeInstanceOf(RegistrationValidationError);

    expect(passwordHasher).not.toHaveBeenCalled();
    expect(repository.createCustomer).not.toHaveBeenCalled();
  });

  it('maps duplicate email conflicts to the intentional HTTP 409 error', async () => {
    const repository = createRepository();
    vi.mocked(repository.createCustomer).mockRejectedValue(
      new DuplicateUserEmailError(),
    );

    await expect(
      registerUser(
        {
          name: 'Nino',
          email: 'nino@example.com',
          password: 'long-enough-password',
        },
        {
          repository,
          passwordHasher: vi.fn().mockResolvedValue('hash'),
        },
      ),
    ).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
      status: 409,
    });
  });
});
