type RouteHandler<TArguments extends unknown[]> = (
  ...arguments_: TArguments
) => Response | Promise<Response>;

export function logRouteHandlerError(route: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const errorName = /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : "UnknownError";
  const errorMessage =
    process.env.NODE_ENV === "production"
      ? "Unexpected route handler error; details redacted"
      : error instanceof Error ? error.message : "Unknown route handler error";

  // Do not pass the request, request body, error object or stack to the logger.
  // Prisma/transport messages can embed query arguments or credential-bearing URLs.
  // Production diagnostics retain the route/type, never a raw third-party message.
  console.error("Route handler failed", {
    route,
    errorName,
    errorMessage,
  });
}

export function withRouteHandlerErrorLogging<TArguments extends unknown[]>(
  route: string,
  handler: RouteHandler<TArguments>,
): (...arguments_: TArguments) => Promise<Response> {
  return async (...arguments_: TArguments): Promise<Response> => {
    try {
      return await handler(...arguments_);
    } catch (error) {
      logRouteHandlerError(route, error);
      throw error;
    }
  };
}
