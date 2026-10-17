"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  applyAdminFieldErrors,
  describeAdminMutationFailure,
  useAdminMutationRequest,
} from "@/components/admin/api-client";
import {
  adminImagesFormSchema,
  toAdminImagesPayload,
  type AdminImagesFormValues,
} from "@/components/admin/form-schemas";
import { MutationFeedback } from "@/components/admin/mutation-feedback";
import { FieldError } from "@/components/ui/feedback";
import type { AdminVehicleDto } from "@/server/services/admin/dto";

type ImagesFormProps = Readonly<{
  vehicleId: string;
  defaultValues: AdminImagesFormValues;
}>;

export function ImagesForm({ vehicleId, defaultValues }: ImagesFormProps) {
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    register,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<AdminImagesFormValues>({
    resolver: zodResolver(adminImagesFormSchema),
    defaultValues,
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "images",
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    try {
      await requestAdminMutation<AdminVehicleDto>({
        path: `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/images`,
        method: "PUT",
        body: toAdminImagesPayload(values),
      });
      setSuccess("Image list saved.");
      router.refresh();
    } catch (reason) {
      const hasFieldErrors = applyAdminFieldErrors(reason, setFieldError);
      setError(hasFieldErrors ? "Correct the highlighted fields." : describeAdminMutationFailure(reason));
    }
  });

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      {fields.length > 0 ? (
        <div className="admin-repeat-list">
          {fields.map((field, index) => (
            <fieldset key={field.id} className="admin-repeat-item">
              <legend>Image {index + 1}</legend>
              <div className="admin-form-grid">
                <label>
                  URL
                  <input
                    aria-invalid={Boolean(errors.images?.[index]?.url)}
                    {...register(`images.${index}.url`)}
                  />
                  <FieldError message={errors.images?.[index]?.url?.message} />
                </label>
                <label>
                  Alternative text
                  <input
                    aria-invalid={Boolean(errors.images?.[index]?.alt)}
                    {...register(`images.${index}.alt`)}
                  />
                  <FieldError message={errors.images?.[index]?.alt?.message} />
                </label>
                <label>
                  Sort order
                  <input
                    type="number"
                    aria-invalid={Boolean(errors.images?.[index]?.sortOrder)}
                    {...register(`images.${index}.sortOrder`)}
                  />
                  <FieldError message={errors.images?.[index]?.sortOrder?.message} />
                </label>
              </div>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => remove(index)}
              >
                Remove image
              </button>
            </fieldset>
          ))}
        </div>
      ) : (
        <p className="empty-state">No images configured.</p>
      )}
      <FieldError message={errors.images?.message} />
      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={() => append({ url: "", alt: "", sortOrder: String(fields.length) })}
        >
          Add image
        </button>
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save images"}
        </button>
      </div>
      <MutationFeedback error={error} success={success} />
    </form>
  );
}

