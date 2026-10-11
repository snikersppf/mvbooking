type RouteHandler<TArguments extends unknown[]> = (
  ...arguments_: TArguments
) => Response | Promise<Response>;

export function logRouteHandlerError(route: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage =
    error instanceof Error ? error.message : "Unknown route handler error";

  // Do not pass the request, request body, error object or stack to the logger.
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
