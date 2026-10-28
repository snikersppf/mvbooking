import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/leads/[id]/review/route";
import { reviewLead } from "@/server/services/leads/admin";

vi.mock("@/server/auth/guards", () => ({ requireRole: vi.fn(async () => ({ id: "manager-1" })) }));
vi.mock("@/server/security/api-rate-limit", () => ({ enforceAdminMutationRateLimit: vi.fn() }));
vi.mock("@/server/services/leads/admin", () => ({ reviewLead: vi.fn(async () => ({ id: "lead-1", status: "IN_PROGRESS" })) }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("APP_ORIGIN", "https://booking.example.test"); });
afterEach(() => vi.unstubAllEnvs());
const context = { params: Promise.resolve({ id: "lead-1" }) };
function request(origin = "https://booking.example.test", contentType = "application/json") {
  return new Request("https://booking.example.test/api/admin/leads/lead-1/review", {
    method: "POST", headers: { Origin: origin, "Content-Type": contentType }, body: "{}",
  });
}
it("marks an actual authenticated card visit and returns its current status", async () => {
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ data: { lead: { status: "IN_PROGRESS" } } });
  expect(reviewLead).toHaveBeenCalledWith("lead-1");
});
it("rejects cross-origin reviews before mutation", async () => {
  expect((await POST(request("https://other.example.test"), context)).status).toBe(403);
  expect(reviewLead).not.toHaveBeenCalled();
});
it("requires JSON for review requests", async () => {
  expect((await POST(request("https://booking.example.test", "text/plain"), context)).status).toBe(415);
  expect(reviewLead).not.toHaveBeenCalled();
});
