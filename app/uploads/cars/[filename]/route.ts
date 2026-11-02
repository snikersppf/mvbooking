import { readStoredVehicleImage } from "@/server/services/admin/vehicle-image-storage";

// Runtime uploads are not part of Next's build-time public asset manifest.
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const image = await readStoredVehicleImage(filename);
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.bytes), { headers: {
    "Content-Type": image.type,
    "Content-Length": String(image.bytes.length),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable",
  } });
}
