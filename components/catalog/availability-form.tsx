import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Form from "next/form";

type AvailabilityFormProps = Readonly<{
  action: string;
  startDate: string;
  endDate: string;
}>;

export function AvailabilityForm({
  action,
  startDate,
  endDate,
}: AvailabilityFormProps) {
  return (
    <Form action={action} className="availability-form">
      <label>
        Start date with offset
        <Input
          name="startDate"
          defaultValue={startDate}
          placeholder="2026-11-10T10:00:00+04:00"
          required
        />
      </label>
      <label>
        End date with offset
        <Input
          name="endDate"
          defaultValue={endDate}
          placeholder="2026-11-13T10:00:00+04:00"
          required
        />
      </label>
      <Button type="submit">Check availability</Button>
      <p className="muted-text">This check does not reserve the vehicle.</p>
    </Form>
  );
}
