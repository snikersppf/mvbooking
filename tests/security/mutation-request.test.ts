import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/server/config/auth";
import { requireAppOrigin } from "@/server/config/http";
import {
  assertTrustedMutationRequest,
  MutationRequestError,
} from "@/server/security/mutation-request";

const APP_ORIGIN = "https://booking.example";

function mutationRequest(
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request(`${APP_ORIGIN}/api/test`, {
    method,
    headers,
    body: method === "GET" ? undefined : "{}",
  });
}

describe("requireAppOrigin", () => {
  it("returns a normalized HTTP(S) origin", () => {
    expect(requireAppOrigin({ APP_ORIGIN: " https://booking.example/ " })).toBe(
      APP_ORIGIN,
    );
    expect(requireAppOrigin({ APP_ORIGIN: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    );
  });

  it.each([
    undefined,
    "ftp://booking.example",
    "https://user:pass@booking.example",
    "https://booking.example/app",
    "not a URL",
  ])("rejects an invalid application origin: %s", (value) => {
    expect(() => requireAppOrigin({ APP_ORIGIN: value })).toThrow(
      ConfigurationError,
    );
  });
});

describe("assertTrustedMutationRequest", () => {
  it.each(["POST", "PATCH", "PUT", "DELETE"])(
    "accepts an exact same-origin JSON %s request",
    (method) => {
      const request = mutationRequest(
        {
          origin: APP_ORIGIN,
          "content-type": "application/json; charset=utf-8",
          "sec-fetch-site": "same-origin",
        },
        method,
      );

      expect(() =>
        assertTrustedMutationRequest(request, APP_ORIGIN),
      ).not.toThrow();
    },
  );

  it.each([
    {},
    { origin: "null", "content-type": "application/json" },
    {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    {
      origin: `${APP_ORIGIN}/`,
      "content-type": "application/json",
    },
    {
      origin: APP_ORIGIN,
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
    },
  ])("rejects a missing, foreign, or cross-site origin", (headers) => {
    expect(() =>
      assertTrustedMutationRequest(
        mutationRequest(headers as Record<string, string>),
        APP_ORIGIN,
      ),
    ).toThrowError(
      expect.objectContaining<Partial<MutationRequestError>>({
        status: 403,
        code: "UNTRUSTED_ORIGIN",
      }),
    );
  });

  it.each([undefined, "text/plain", "application/x-www-form-urlencoded"])(
    "rejects unsupported content type: %s",
    (contentType) => {
      const headers: Record<string, string> = { origin: APP_ORIGIN };
      if (contentType) headers["content-type"] = contentType;

      expect(() =>
        assertTrustedMutationRequest(mutationRequest(headers), APP_ORIGIN),
      ).toThrowError(
        expect.objectContaining<Partial<MutationRequestError>>({
          status: 415,
          code: "UNSUPPORTED_MEDIA_TYPE",
        }),
      );
    },
  );

  it("does not apply mutation checks to safe methods", () => {
    expect(() =>
      assertTrustedMutationRequest(mutationRequest({}, "GET"), APP_ORIGIN),
    ).not.toThrow();
  });
});
