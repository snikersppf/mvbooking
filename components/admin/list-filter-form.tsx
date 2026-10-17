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

export function AdminListFilterForm({
  action,
  fields,
}: AdminListFilterFormProps) {
  return (
    <form className="admin-filter-form" action={action} method="get">
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          {field.options ? (
            <select name={field.name} defaultValue={field.value ?? ""}>
              <option value="">All</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input name={field.name} defaultValue={field.value ?? ""} />
          )}
        </label>
      ))}
      <div className="admin-filter-actions">
        <button className="button" type="submit">
          Apply filters
        </button>
        <Link href={action}>Clear</Link>
      </div>
    </form>
  );
}

