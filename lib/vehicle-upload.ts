export const MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VEHICLE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_VEHICLE_UPLOAD_FILES = 10;
export const VEHICLE_UPLOAD_HELP = "JPEG, PNG or WebP. Up to 5 MB per photo, 10 photos and 20 MB per request.";

export function isStoredVehicleImagePath(value: string): boolean {
  return /^\/uploads\/cars\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(value);
}
