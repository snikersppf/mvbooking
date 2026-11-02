import { createHash } from "node:crypto";
import { MAX_VEHICLE_UPLOAD_BYTES, MAX_VEHICLE_UPLOAD_FILES } from "@/lib/vehicle-upload";
import { ApiRequestError } from "@/server/http/api-response";
import { readJsonBody } from "@/server/http/request";
import { checkVehicleImage, removeStoredVehicleImage, storeVehicleImage, type CheckedVehicleImage } from "@/server/services/admin/vehicle-image-storage";

function badUpload(status = 400): never {
  throw new ApiRequestError(status, status === 413 ? "UPLOAD_TOO_LARGE" : "INVALID_UPLOAD", "errors.validation");
}

export async function readVehicleUpload(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return { payload: await readJsonBody(request), files: [] as CheckedVehicleImage[], fingerprint: [] as string[] };
  }
  const declaredSize = request.headers.get("content-length");
  if (declaredSize && Number(declaredSize) > MAX_VEHICLE_UPLOAD_BYTES) badUpload(413);
  // Bound the stream even when Content-Length is missing or dishonest, before parsing multipart.
  if (!request.body) badUpload();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_VEHICLE_UPLOAD_BYTES) {
        await reader.cancel();
        badUpload(413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  let payload: unknown;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    if ([...form.keys()].some((key) => key !== "payload" && key !== "files") || form.getAll("payload").length !== 1) badUpload();
    const json = form.get("payload");
    if (typeof json !== "string") badUpload();
    payload = JSON.parse(json);
  } catch {
    return badUpload();
  }
  const entries = form.getAll("files");
  if (entries.length > MAX_VEHICLE_UPLOAD_FILES) badUpload();
  const files: CheckedVehicleImage[] = [];
  for (const entry of entries) {
    if (typeof entry === "string") badUpload();
    files.push(checkVehicleImage(Buffer.from(await entry.arrayBuffer()), entry.type));
  }
  return { payload, files, fingerprint: files.map(({ bytes, extension }) => `${extension}:${createHash("sha256").update(bytes).digest("hex")}`) };
}

// Lazy storage means idempotent replays do not create files. Reuse files on transaction retries.
export async function withVehicleUpload<T>(
  files: readonly CheckedVehicleImage[],
  operation: (store: () => Promise<string[]>) => Promise<T>,
): Promise<T> {
  const urls: string[] = [];
  let stored: Promise<string[]> | undefined;
  const store = () => stored ??= (async () => {
    for (const file of files) urls.push(await storeVehicleImage(file));
    return urls;
  })();
  try {
    return await operation(store);
  } catch (error) {
    await Promise.all(urls.map((url) => removeStoredVehicleImage(url).catch(() => {})));
    throw error;
  }
}
