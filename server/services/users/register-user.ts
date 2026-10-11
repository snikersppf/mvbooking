import type { ZodError } from "zod";
import {
  DuplicateUserEmailError,
  userRepository,
  type PublicUser,
  type UserRepository,
} from "@/server/repositories/users";
import { hashPassword } from "@/server/security/password";
import {
  registrationSchema,
  type RegistrationInput,
} from "@/server/validators/auth";

export class RegistrationValidationError extends Error {
  readonly code = "REGISTRATION_VALIDATION_FAILED";
  readonly status = 400;

  constructor(readonly details: ZodError) {
    super("Registration input is invalid.");
    this.name = "RegistrationValidationError";
  }
}

export class RegistrationConflictError extends Error {
  readonly code = "EMAIL_ALREADY_REGISTERED";
  readonly status = 409;

  constructor() {
    super("A user with this email already exists.");
    this.name = "RegistrationConflictError";
  }
}

export type RegisterUserDependencies = {
  repository: UserRepository;
  passwordHasher: (password: string) => Promise<string>;
};

const defaultDependencies: RegisterUserDependencies = {
  repository: userRepository,
  passwordHasher: hashPassword,
};

export async function registerUser(
  rawInput: unknown,
  dependencies: RegisterUserDependencies = defaultDependencies,
): Promise<PublicUser> {
  const parsed = registrationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new RegistrationValidationError(parsed.error);
  }

  const input: RegistrationInput = parsed.data;
  const passwordHash = await dependencies.passwordHasher(input.password);

  try {
    return await dependencies.repository.createCustomer({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
    });
  } catch (error) {
    if (error instanceof DuplicateUserEmailError) {
      throw new RegistrationConflictError();
    }
    throw error;
  }
}
