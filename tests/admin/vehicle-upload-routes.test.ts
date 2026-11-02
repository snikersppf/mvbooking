import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/vehicles/route";
import { PUT } from "@/app/api/admin/vehicles/[id]/images/route";
import { GET } from "@/app/uploads/cars/[filename]/route";
import { requireRole } from "@/server/auth/guards";
import { AuthenticationRequiredError } from "@/server/auth/errors";
import { createAdminVehicle, replaceAdminVehicleImages } from "@/server/services/admin/vehicles";
import { storeVehicleImage, removeStoredVehicleImage, readStoredVehicleImage } from "@/server/services/admin/vehicle-image-storage";
import { emptyAdminVehicleFormValues, toAdminVehicleCreatePayload } from "@/components/admin/form-schemas";
import { vehicleUploadFormData } from "@/components/admin/api-client";

vi.mock("@/server/auth/guards", () => ({ requireRole: vi.fn(async () => ({ id: "manager-1", sessionVersion: 3 })) }));
vi.mock("@/server/security/api-rate-limit", () => ({ enforceAdminMutationRateLimit: vi.fn() }));
vi.mock("@/server/services/admin/idempotency", () => ({ executeAdminMutation: vi.fn(async ({ operation }) => operation()) }));
vi.mock("@/server/services/admin/vehicles", () => ({ createAdminVehicle: vi.fn(async () => ({ id: "car-1" })), replaceAdminVehicleImages: vi.fn(async () => ({ id: "car-1" })), listAdminVehicles: vi.fn() }));
vi.mock("@/server/services/admin/vehicle-image-storage", async (original) => ({
  ...await original<typeof import("@/server/services/admin/vehicle-image-storage")>(),
  storeVehicleImage: vi.fn(async () => "/uploads/cars/b38ebea6-ad52-4e2d-8d36-4f07e27e10aa.png"),
  removeStoredVehicleImage: vi.fn(async () => {}),
  readStoredVehicleImage: vi.fn(),
}));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC1lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=", "base64");
const url = "/uploads/cars/b38ebea6-ad52-4e2d-8d36-4f07e27e10aa.png";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("APP_ORIGIN", "https://booking.example.test"); });
afterEach(() => vi.unstubAllEnvs());
function request(payload: unknown, method = "POST", origin = "https://booking.example.test") {
  return new Request("https://booking.example.test/api/admin/vehicles", { method, headers: { Origin: origin }, body: vehicleUploadFormData(payload, [new File([png], "photo.png", { type: "image/png" })]) });
}
function vehicle() {
  return toAdminVehicleCreatePayload({ ...emptyAdminVehicleFormValues(), slug: "car-1", brand: "Toyota", model: "Yaris" });
}
it("creates a vehicle with file paths and image metadata, never image bytes", async () => {
  expect((await POST(request(vehicle()))).status).toBe(201);
  expect(storeVehicleImage).toHaveBeenCalledTimes(1);
  expect(createAdminVehicle).toHaveBeenCalledWith(expect.objectContaining({
    actorUserId: "manager-1", expectedSessionVersion: 3,
    images: { images: [{ url, sortOrder: 0, alt: null }] },
  }), { transaction: undefined });
});
it("retains existing photos and appends uploaded photos in the images editor", async () => {
  const response = await PUT(request({ images: [{ url: "/design/car.jpg", alt: "Existing", sortOrder: 4 }] }, "PUT"), { params: Promise.resolve({ id: "car-1" }) });
  expect(response.status).toBe(200);
  expect(replaceAdminVehicleImages).toHaveBeenCalledWith(expect.objectContaining({ images: { images: [
    { url: "/design/car.jpg", alt: "Existing", sortOrder: 4 }, { url, alt: null, sortOrder: 5 },
  ] } }), { transaction: undefined });
});
it("rejects foreign origins, unauthenticated users and invalid vehicle fields before storage", async () => {
  expect((await POST(request(vehicle(), "POST", "https://other.example.test"))).status).toBe(403);
  expect(requireRole).not.toHaveBeenCalled();
  vi.mocked(requireRole).mockRejectedValueOnce(new AuthenticationRequiredError());
  expect((await POST(request(vehicle()))).status).toBe(401);
  expect((await POST(request({ ...vehicle(), slug: "INVALID" }))).status).toBe(400);
  expect(storeVehicleImage).not.toHaveBeenCalled();
});
it("compensates a failed vehicle mutation by removing its uploaded file", async () => {
  vi.mocked(createAdminVehicle).mockRejectedValueOnce(new AuthenticationRequiredError());
  expect((await POST(request(vehicle()))).status).toBe(401);
  expect(removeStoredVehicleImage).toHaveBeenCalledWith(url);
});
it("serves new files with an explicit MIME and nosniff; missing files return 404", async () => {
  vi.mocked(readStoredVehicleImage).mockResolvedValueOnce({ bytes: png, type: "image/png" });
  const context = { params: Promise.resolve({ filename: url.split("/").pop()! }) };
  const response = await GET(new Request("https://booking.example.test"), context);
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  vi.mocked(readStoredVehicleImage).mockResolvedValueOnce(null);
  expect((await GET(new Request("https://booking.example.test"), context)).status).toBe(404);
});
