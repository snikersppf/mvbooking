import { getTranslations } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Form from "next/form";

type AvailabilityFormProps = Readonly<{
  action: string;
  startDate: string;
  endDate: string;
}>;

export async function AvailabilityForm({
  action,
  startDate,
  endDate,
}: AvailabilityFormProps) {
  const t = await getTranslations();
  return (
    <Form action={action} className="availability-form">
      <label>
        {t("Start date with offset")}<Input
          name="startDate"
          defaultValue={startDate}
          placeholder="2026-11-10T10:00:00+04:00"
          required
        />
      </label>
      <label>
        {t("End date with offset")}<Input
          name="endDate"
          defaultValue={endDate}
          placeholder="2026-11-13T10:00:00+04:00"
          required
        />
      </label>
      <Button type="submit">{t("Check availability")}</Button>
      <p className="muted-text">{t("This check does not reserve the vehicle.")}</p>
    </Form>
  );
}
