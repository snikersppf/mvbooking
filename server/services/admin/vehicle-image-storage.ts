import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiRequestError } from "@/server/http/api-response";
import { MAX_VEHICLE_IMAGE_BYTES, isStoredVehicleImagePath } from "@/lib/vehicle-upload";

export const vehicleImageDirectory = () => path.join(process.cwd(), "public", "uploads", "cars");
export type CheckedVehicleImage = Readonly<{ bytes: Buffer; extension: "jpg" | "png" | "webp" }>;

function invalidImage(): never {
  throw new ApiRequestError(400, "INVALID_IMAGE", "errors.validation");
}

// Check the actual file signature as well as the declared MIME type. Never accept SVG/HTML.
export function checkVehicleImage(bytes: Buffer, mime: string): CheckedVehicleImage {
  if (!bytes.length || bytes.length > MAX_VEHICLE_IMAGE_BYTES) invalidImage();
  if (mime === "image/png" && bytes.length >= 45 &&
      bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
      bytes.readUInt32BE(8) === 13 && bytes.toString("ascii", 12, 16) === "IHDR" &&
      bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0 &&
      bytes.subarray(-12).equals(Buffer.from("0000000049454e44ae426082", "hex"))) {
    return { bytes, extension: "png" };
  }
  if (mime === "image/jpeg" && bytes.length >= 4 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
      bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    return { bytes, extension: "jpg" };
  }
  if (mime === "image/webp" && bytes.length >= 20 &&
      bytes.toString("ascii", 0, 4) === "RIFF" && bytes.readUInt32LE(4) === bytes.length - 8 &&
      bytes.toString("ascii", 8, 12) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16))) {
    return { bytes, extension: "webp" };
  }
  return invalidImage();
}

export async function storeVehicleImage(image: CheckedVehicleImage, directory = vehicleImageDirectory()): Promise<string> {
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${image.extension}`;
  // Runtime files live on a persistent volume, not in the standalone build trace.
  const destination = path.join(/*turbopackIgnore: true*/ directory, filename);
  try {
    await writeFile(destination, image.bytes, { flag: "wx", mode: 0o644 });
  } catch (error) {
    // A failed write may leave a partial file; never delete an existing UUID collision.
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") await unlink(destination).catch(() => {});
    throw error;
  }
  return `/uploads/cars/${filename}`;
}

export async function removeStoredVehicleImage(url: string, directory = vehicleImageDirectory()): Promise<void> {
  const filename = url.slice("/uploads/cars/".length);
  if (!isStoredVehicleImagePath(url)) throw new Error("Invalid stored image path.");
  await unlink(path.join(/*turbopackIgnore: true*/ directory, filename));
}

export async function readStoredVehicleImage(filename: string, directory = vehicleImageDirectory()) {
  if (!isStoredVehicleImagePath(`/uploads/cars/${filename}`)) return null;
  try {
    const bytes = await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, filename));
    const type = filename.endsWith(".jpg") ? "image/jpeg" : filename.endsWith(".png") ? "image/png" : "image/webp";
    return { bytes, type };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
