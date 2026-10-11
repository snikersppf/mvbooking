import { afterEach, describe, expect, it, vi } from "vitest";
import {
  logRouteHandlerError,
  withRouteHandlerErrorLogging,
} from "@/server/http/route-handler-errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route handler error logging", () => {
  it("logs only the route, error name and message", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new TypeError("Database unavailable"), {
      password: "must-not-be-logged",
      token: "must-not-be-logged",
    });

    logRouteHandlerError("POST /api/example", error);

    expect(consoleError).toHaveBeenCalledWith("Route handler failed", {
      route: "POST /api/example",
      errorName: "TypeError",
      errorMessage: "Database unavailable",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "must-not-be-logged",
    );
  });

  it("logs and rethrows an unexpected wrapped-handler error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Unexpected failure");
    const handler = withRouteHandlerErrorLogging(
      "GET /api/example",
      vi.fn().mockRejectedValue(error),
    );

    await expect(handler()).rejects.toBe(error);
  });
});
