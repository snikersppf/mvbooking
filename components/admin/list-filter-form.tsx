import { getTranslations } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";

export type AdminFilterField = Readonly<{
  name: string;
  label: string;
  value?: string;
  options?: ReadonlyArray<Readonly<{ value: string; label: string }>>;
}>;

type AdminListFilterFormProps = Readonly<{
  action: string;
  fields: readonly AdminFilterField[];
}>;

export async function AdminListFilterForm({
  action,
  fields,
}: AdminListFilterFormProps) {
  const t = await getTranslations();
  return (
    <form className="admin-filter-form" action={action} method="get">
      {fields.map((field) => (
        <label key={field.name}>
          {t(field.label)}
          {field.options ? (
            <Select name={field.name} defaultValue={field.value ?? ""}>
              <option value="">{t("All")}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </Select>
          ) : (
            <Input name={field.name} defaultValue={field.value ?? ""} />
          )}
        </label>
      ))}
      <div className="admin-filter-actions">
        <Button className="button" type="submit">
          {t("Apply filters")}</Button>
        <Link href={action}>{t("Clear")}</Link>
      </div>
    </form>
  );
}

