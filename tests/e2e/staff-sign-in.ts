import { expect, type Page, type TestInfo } from "@playwright/test";
import type { seedBookingFlow } from "./booking-flow.fixture";

type StaffFixture = Awaited<ReturnType<typeof seedBookingFlow>>;

/** Submit once and report only allowlisted metadata, never credentials or URLs. */
export async function submitStaffSignIn(page: Page, fixture: StaffFixture, callbackPath: string, testInfo: TestInfo) {
  await page.context().setExtraHTTPHeaders({ "X-Forwarded-For": fixture.clientIp });
  const before = await fixture.authDiagnostics();
  const factor = await fixture.managerSecondFactor();
  await page.locator("#login-otp").fill(factor.code);
  let requests = 0;
  const countRequest = (request: import("@playwright/test").Request) => {
    if (new URL(request.url()).pathname === "/api/auth/callback/credentials" && request.method() === "POST") requests++;
  };
  page.on("request", countRequest);
  let callbackStatus: number | null = null;
  let authError: "CredentialsSignin" | "other" | null = null;
  let sessionAuthenticated = false;
  let mfaVerified = false;
  try {
    const response = page.waitForResponse((candidate) => new URL(candidate.url()).pathname === "/api/auth/callback/credentials" && candidate.request().method() === "POST", { timeout: 15_000 });
    const [result] = await Promise.all([response, page.locator('button[type="submit"]').click()]);
    callbackStatus = result.status();
    const body: unknown = await result.json();
    if (body && typeof body === "object" && "url" in body && typeof body.url === "string") {
      const error = new URL(body.url, page.url()).searchParams.get("error");
      authError = error === "CredentialsSignin" ? error : error ? "other" : null;
    }
    // Auth.js can return HTTP 200 for rejected credentials. Check its JSON too.
    expect(authError, "Credentials callback rejected the staff login; see safe diagnostics").toBeNull();
    expect(result.ok()).toBe(true);
    const session = await page.evaluate(async () => {
      const body = await (await fetch("/api/auth/session")).json();
      return { authenticated: Boolean(body?.user), mfaVerified: body?.user?.mfaVerified === true };
    });
    sessionAuthenticated = session.authenticated;
    mfaVerified = session.mfaVerified;
    expect(session).toEqual({ authenticated: true, mfaVerified: true });
    await expect(page).toHaveURL((url) => url.pathname === callbackPath, { timeout: 15_000 });
  } finally {
    page.off("request", countRequest);
    const diagnostics = {
      before, after: await fixture.authDiagnostics(), factor: factor.kind, requests,
      callbackStatus, authError, sessionAuthenticated, mfaVerified,
      reachedCallback: new URL(page.url()).pathname === callbackPath,
      isolatedIpBucket: true,
    };
    console.info("[staff-auth]", JSON.stringify(diagnostics));
    await testInfo.attach("staff-auth-diagnostics.json", { body: JSON.stringify(diagnostics, null, 2), contentType: "application/json" });
  }
}
