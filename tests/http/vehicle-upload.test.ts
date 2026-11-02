import { afterEach, expect, it, vi } from "vitest";
import { MAX_VEHICLE_UPLOAD_BYTES } from "@/lib/vehicle-upload";
import { readVehicleUpload, withVehicleUpload } from "@/server/http/vehicle-upload";
import { removeStoredVehicleImage, storeVehicleImage } from "@/server/services/admin/vehicle-image-storage";

vi.mock("@/server/services/admin/vehicle-image-storage", async (original) => ({
  ...await original<typeof import("@/server/services/admin/vehicle-image-storage")>(),
  storeVehicleImage: vi.fn(async () => "/uploads/cars/test.png"),
  removeStoredVehicleImage: vi.fn(async () => {}),
}));
afterEach(() => vi.clearAllMocks());
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=", "base64");
function request(filename = "../../photo.exe") {
  const form = new FormData();
  form.set("payload", JSON.stringify({ images: [] }));
  form.append("files", new Blob([png], { type: "image/png" }), filename);
  return new Request("https://booking.example/api/admin/vehicles", { method: "POST", body: form });
}

it("reads multipart JSON and validates files; the fingerprint ignores user-controlled filenames", async () => {
  const upload = await readVehicleUpload(request());
  expect(upload.payload).toEqual({ images: [] });
  expect(upload.files).toEqual([{ bytes: png, extension: "png" }]);
  expect(upload.fingerprint).toEqual((await readVehicleUpload(request("other.png"))).fingerprint);
});
it("retains compatibility with JSON clients", async () => {
  expect(await readVehicleUpload(new Request("https://booking.example", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"images":[]}' })))
    .toEqual({ payload: { images: [] }, files: [], fingerprint: [] });
});
it("rejects invalid multipart, extra fields and too many files", async () => {
  const form = new FormData();
  form.set("payload", "{}");
  form.set("unexpected", "value");
  await expect(readVehicleUpload(new Request("https://booking.example", { method: "POST", body: form }))).rejects.toMatchObject({ code: "INVALID_UPLOAD" });
  form.delete("unexpected");
  for (let index = 0; index < 11; index++) form.append("files", new Blob([png], { type: "image/png" }), "photo.png");
  await expect(readVehicleUpload(new Request("https://booking.example", { method: "POST", body: form }))).rejects.toMatchObject({ code: "INVALID_UPLOAD" });
  await expect(readVehicleUpload(new Request("https://booking.example", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=broken" }, body: "invalid" }))).rejects.toMatchObject({ code: "INVALID_UPLOAD" });
});
it("bounds bodies without trusting Content-Length", async () => {
  let chunks = 0;
  const stream = new ReadableStream({ pull(controller) { chunks++; controller.enqueue(new Uint8Array(1024 * 1024)); } });
  const upload = new Request("https://booking.example", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=test", "Content-Length": "1" }, body: stream, duplex: "half" } as RequestInit);
  await expect(readVehicleUpload(upload)).rejects.toMatchObject({ status: 413 });
  expect(chunks).toBeLessThanOrEqual(MAX_VEHICLE_UPLOAD_BYTES / (1024 * 1024) + 2);
});
it("does not store on idempotent replay and reuses files when an operation retries", async () => {
  const { files } = await readVehicleUpload(request());
  await withVehicleUpload(files, async () => "cached response");
  expect(storeVehicleImage).not.toHaveBeenCalled();
  await withVehicleUpload(files, async (store) => {
    expect(await store()).toEqual(await store());
  });
  expect(storeVehicleImage).toHaveBeenCalledTimes(1);
  expect(removeStoredVehicleImage).not.toHaveBeenCalled();
});
it("cleans saved files on DB failures and partial storage failures", async () => {
  const { files } = await readVehicleUpload(request());
  await expect(withVehicleUpload(files, async (store) => {
    await store();
    throw new Error("DB failed");
  })).rejects.toThrow("DB failed");
  expect(removeStoredVehicleImage).toHaveBeenCalledWith("/uploads/cars/test.png");
  vi.mocked(storeVehicleImage).mockRejectedValueOnce(new Error("Disk full"));
  await expect(withVehicleUpload(files, async (store) => store())).rejects.toThrow("Disk full");
});
