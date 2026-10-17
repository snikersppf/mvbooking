"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  applyAdminFieldErrors,
  describeAdminMutationFailure,
  useAdminMutationRequest,
} from "@/components/admin/api-client";
import {
  createAdminBookingStatusFormSchema,
  toAdminBookingStatusPayload,
  type AdminBookingStatusFormValues,
} from "@/components/admin/form-schemas";
import { MutationFeedback } from "@/components/admin/mutation-feedback";
import { FieldError } from "@/components/ui/feedback";
import { formatAdminEnum } from "@/lib/admin-view";
import type { AdminBookingDto } from "@/server/services/admin/dto";

type BookingStatusFormProps = Readonly<{
  bookingId: string;
  allowedStatuses: readonly AdminBookingStatusFormValues["status"][];
  managerComment: string | null;
}>;

export function BookingStatusForm({
  bookingId,
  allowedStatuses,
  managerComment,
}: BookingStatusFormProps) {
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const schema = useMemo(
    () => createAdminBookingStatusFormSchema(allowedStatuses),
    [allowedStatuses],
  );
  const {
    handleSubmit,
    register,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<AdminBookingStatusFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: allowedStatuses[0] ?? "PENDING",
      managerComment: managerComment ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSuccess(null);
    try {
      await requestAdminMutation<AdminBookingDto>({
        path: `/api/admin/bookings/${encodeURIComponent(bookingId)}/status`,
        method: "PATCH",
        body: toAdminBookingStatusPayload(values, allowedStatuses),
      });
      setSuccess("Booking status updated.");
      router.refresh();
    } catch (reason) {
      const hasFieldErrors = applyAdminFieldErrors(reason, setFieldError);
      setError(hasFieldErrors ? "Correct the highlighted fields." : describeAdminMutationFailure(reason));
    }
  });

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      <label>
        New status
        <select {...register("status")}>
          {allowedStatuses.map((status) => (
            <option key={status} value={status}>
              {formatAdminEnum(status)}
            </option>
          ))}
        </select>
        <FieldError message={errors.status?.message} />
      </label>
      <label>
        Manager comment
        <textarea
          rows={5}
          aria-invalid={Boolean(errors.managerComment)}
          {...register("managerComment")}
        />
        <FieldError message={errors.managerComment?.message} />
      </label>
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating…" : "Update status"}
      </button>
      <MutationFeedback error={error} success={success} />
    </form>
  );
}

