import { getTranslations } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";

export type AdminFilterField = Readonly<{
  name: string;
  label: string;
  value?: string;
  includeAll?: boolean;
  options?: ReadonlyArray<Readonly<{ value: string; label: string }>>;
}>;

type AdminListFilterFormProps = Readonly<{
  action: string;
  fields: readonly AdminFilterField[];
  hiddenFields?: Readonly<Record<string, string | undefined>>;
}>;

export async function AdminListFilterForm({
  action,
  fields,
  hiddenFields = {},
}: AdminListFilterFormProps) {
  const t = await getTranslations();
  return (
    <form className="admin-filter-form" action={action} method="get">
      {Object.entries(hiddenFields).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
      {fields.map((field) => (
        <label key={field.name}>
          {t(field.label)}
          {field.options ? (
            <Select name={field.name} defaultValue={field.value ?? ""}>
              {field.includeAll !== false && <option value="">{t("All")}</option>}
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

