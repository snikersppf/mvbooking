export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";
  readonly status = 401;

  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor() {
    super("The current user does not have the required role.");
    this.name = "ForbiddenError";
  }
}

export class AuthInfrastructureError extends Error {
  readonly code = "AUTH_INFRASTRUCTURE_UNAVAILABLE";
  readonly status = 503;

  constructor(options?: ErrorOptions) {
    super("Authentication infrastructure is unavailable.", options);
    this.name = "AuthInfrastructureError";
  }
}
