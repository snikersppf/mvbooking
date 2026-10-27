import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(), lead: { create: vi.fn() }, vehicle: { findFirst: vi.fn() },
}));
vi.mock("@/server/db/prisma", () => ({ getPrismaClient: () => db }));
import { POST } from "@/app/api/leads/route";
import { createLeadSchema } from "@/server/validators/lead";

const input = { name: "Test customer", email: "customer@example.test", consent: true };
function request(body: unknown, origin = "https://booking.example.test") {
  return new Request("https://booking.example.test/api/leads", { method: "POST", headers: {
    origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.1",
  }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "https://booking.example.test");
  vi.stubEnv("TRUST_PROXY_HEADERS", "true");
  db.$queryRaw.mockResolvedValue([{ count: 1, retryAfterMs: BigInt(1000) }]);
  db.lead.create.mockResolvedValue({ id: "private-id" });
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("public contact enquiries", () => {
  it("strictly requires consent and at least one validated contact", () => {
    for (const body of [{ ...input, consent: false }, { name: "Test", consent: true }, { ...input, role: "ADMIN" },
      { ...input, status: "CLOSED" }, { ...input, consentVersion: "spoof" }, { ...input, email: "bad" },
      { ...input, startDate: "2030-01-02T00:00:00Z", endDate: "2030-01-01T00:00:00Z" }]) {
      expect(createLeadSchema.safeParse(body).success).toBe(false);
    }
    expect(createLeadSchema.safeParse({ name: "Test", phone: "+995555123456", consent: true }).success).toBe(true);
  });
  it("atomically queues a stub notification and returns no contact or lead id", async () => {
    const response = await POST(request(input));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ data: { accepted: true } });
    expect(db.$queryRaw).toHaveBeenCalledOnce();
    expect(db.lead.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      consentVersion: "contact-2026-10-28", consentAt: expect.any(Date),
      notifications: { create: { type: "LEAD_CREATED", channel: "EMAIL", payload: { provider: "stub" } } },
    }) });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("returns the same accepted result for the honeypot without storing a lead", async () => {
    const response = await POST(request({ ...input, website: "spam.example" }));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ data: { accepted: true } });
    expect(db.$queryRaw).toHaveBeenCalledOnce();
    expect(db.lead.create).not.toHaveBeenCalled();
  });
  it("rejects foreign Origin before reaching PostgreSQL", async () => {
    expect((await POST(request(input, "https://other.example"))).status).toBe(403);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it("enforces the PostgreSQL count and does not persist after the limit", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 6, retryAfterMs: BigInt(1000) }]);
    const response = await POST(request(input));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("1");
    expect(db.lead.create).not.toHaveBeenCalled();
  });
  it("fails closed when the shared store is unavailable", async () => {
    db.$queryRaw.mockRejectedValue(new Error("Database unavailable"));
    expect((await POST(request(input))).status).toBe(503);
    expect(db.lead.create).not.toHaveBeenCalled();
  });
});
