import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ImagesForm } from "@/components/admin/images-form";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { emptyAdminVehicleFormValues } from "@/components/admin/form-schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

it("offers file selection and multipart in the create form", () => {
  const html = renderToStaticMarkup(createElement(VehicleForm, { mode: "create", defaultValues: emptyAdminVehicleFormValues() }));
  expect(html).toContain('encType="multipart/form-data"');
  expect(html).toMatch(/<input[^>]*type="file"[^>]*accept="image\/\*"[^>]*multiple=""/);
});

it("renders current photos and a file picker without asking for image URLs", () => {
  const url = "/uploads/cars/b38ebea6-ad52-4e2d-8d36-4f07e27e10aa.jpg";
  const html = renderToStaticMarkup(createElement(ImagesForm, { vehicleId: "car-1", defaultValues: { images: [{ url, alt: "Car", sortOrder: "0" }] } }));
  expect(html).toContain('encType="multipart/form-data"');
  expect(html).toContain(`src="${url}"`);
  expect(html).toContain('type="file"');
  expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="images\.0\.url"/);
  expect(html).not.toMatch(/<input[^>]*type="text"[^>]*name="images\.0\.url"/);
});
