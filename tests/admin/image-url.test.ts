import { describe, expect, it } from "vitest";
import { adminImagesFormSchema } from "@/components/admin/form-schemas";
import { adminImagesReplaceSchema } from "@/server/validators/admin";

describe("vehicle image URL contract", () => {
  it.each([
    "/\\other-host/car.jpg", "//other-host/car.jpg", "https://user:password@host/car.jpg",
    "https://host/line\nfeed.jpg", "javascript:alert(1)", "data:image/svg+xml,test",
  ])("rejects unsafe URL in both API and form: %s", (url) => {
    expect(adminImagesReplaceSchema.safeParse({ images: [{ url, sortOrder: 0 }] }).success).toBe(false);
    expect(adminImagesFormSchema.safeParse({ images: [{ url, alt: "", sortOrder: "0" }] }).success).toBe(false);
  });

  it.each(["/cars/car.jpg", "https://photos.owner.ge/car.webp", "http://localhost/car.jpg"])(
    "preserves supported URLs: %s", (url) => {
      expect(adminImagesReplaceSchema.safeParse({ images: [{ url, sortOrder: 0 }] }).success).toBe(true);
    },
  );
});
