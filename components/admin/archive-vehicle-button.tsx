"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  describeAdminMutationFailure,
  useAdminMutationRequest,
} from "@/components/admin/api-client";
import { MutationFeedback } from "@/components/admin/mutation-feedback";
import type { AdminVehicleDto } from "@/server/services/admin/dto";

export function ArchiveVehicleButton({ vehicleId }: Readonly<{ vehicleId: string }>) {
  const router = useRouter();
  const requestAdminMutation = useAdminMutationRequest();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function archive(): Promise<void> {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      await requestAdminMutation<AdminVehicleDto>({
        path: `/api/admin/vehicles/${encodeURIComponent(vehicleId)}`,
        method: "DELETE",
      });
      setSuccess("Vehicle archived.");
      router.refresh();
    } catch (reason) {
      setError(describeAdminMutationFailure(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className="button button-danger"
        type="button"
        disabled={pending}
        onClick={archive}
      >
        {pending ? "Archiving…" : "Archive vehicle"}
      </button>
      <MutationFeedback error={error} success={success} />
    </div>
  );
}

