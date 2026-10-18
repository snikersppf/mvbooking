import { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async (handler: (request: NextRequest) => Response) => handler),
}));

import { proxy } from "@/proxy";

describe("proxy with lazy Auth.js configuration", () => {
  it("exports a callable proxy and awaits the auth wrapper before redirecting", async () => {
    expect(proxy).toBeTypeOf("function");
    const request = new NextRequest("https://example.test/admin?page=2");
    const response = await proxy(request, {} as NextFetchEvent);
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://example.test/login?callbackUrl=%2Fadmin%3Fpage%3D2",
    );
  });

  it("still lets an anonymous visitor open the login page", async () => {
    const response = await proxy(
      new NextRequest("https://example.test/login"),
      {} as NextFetchEvent,
    );
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });
});
