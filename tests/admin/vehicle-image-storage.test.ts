import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { checkVehicleImage, readStoredVehicleImage, removeStoredVehicleImage, storeVehicleImage } from "@/server/services/admin/vehicle-image-storage";
import { MAX_VEHICLE_IMAGE_BYTES } from "@/lib/vehicle-upload";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=", "base64");
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

it("stores identical photos with different UUIDs, returns relative paths and serves their bytes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mvbooking-photos-"));
  directories.push(directory);
  const checked = checkVehicleImage(png, "image/png");
  const urls = await Promise.all([storeVehicleImage(checked, directory), storeVehicleImage(checked, directory)]);
  expect(urls[0]).not.toBe(urls[1]);
  for (const url of urls) {
    expect(url).toMatch(/^\/uploads\/cars\/[0-9a-f-]{36}\.png$/);
    const filename = path.basename(url);
    expect(await readFile(path.join(directory, filename))).toEqual(png);
    expect(await readStoredVehicleImage(filename, directory)).toEqual({ bytes: png, type: "image/png" });
    await removeStoredVehicleImage(url, directory);
    expect(await readStoredVehicleImage(filename, directory)).toBeNull();
  }
  expect(await readdir(directory)).toEqual([]);
});

it.each([
  [Buffer.from("<svg onload='alert(1)'/>"), "image/svg+xml"],
  [Buffer.from("<html>not an image</html>"), "image/png"],
  [png, "image/jpeg"],
  [png.subarray(0, -10), "image/png"],
  [Buffer.alloc(0), "image/png"],
  [Buffer.alloc(MAX_VEHICLE_IMAGE_BYTES + 1), "image/png"],
])("rejects unsupported, spoofed, truncated, empty or oversized files", (bytes, type) => {
  expect(() => checkVehicleImage(bytes, type)).toThrowError(expect.objectContaining({ code: "INVALID_IMAGE" }));
});

it("never reads or deletes traversal paths", async () => {
  expect(await readStoredVehicleImage("../schema.prisma")).toBeNull();
  expect(await readStoredVehicleImage("/etc/passwd")).toBeNull();
  await expect(removeStoredVehicleImage("/uploads/cars/../../README.md")).rejects.toThrow("Invalid stored image path");
});
