import {
  ReferenceExpression,
  SelectQueryBuilder,
  StringReference,
} from "$lib/kysely-sqlite-dialect/deps.ts";

export const filterByText = <DB, TB extends keyof DB, O>(
  query: SelectQueryBuilder<DB, TB, O>,
  name: ReferenceExpression<DB, TB>,
  value?: string,
) => {
  if (!value) {
    return query;
  }
  return query.where(name, "like", `%${value}%`);
};

export const filterByValue = <DB, TB extends keyof DB, O, V>(
  query: SelectQueryBuilder<DB, TB, O>,
  name: ReferenceExpression<DB, TB>,
  value?: V,
) => {
  if (!value) {
    return query;
  }
  return query.where(name, "=", value);
};

type FilterSpec = { type?: "text" | "value"; value: unknown };

export const applyFilters = <DB, TB extends keyof DB, O>(
  query: SelectQueryBuilder<DB, TB, O>,
  filters: Partial<Record<StringReference<DB, TB>, FilterSpec>>,
) => {
  for (const [name, filter] of Object.entries(filters)) {
    const { type = "value", value } = filter as FilterSpec;
    if (type === "text") {
      query = filterByText(
        query,
        name as ReferenceExpression<DB, TB>,
        value as string,
      );
    } else if (type === "value") {
      query = filterByValue(
        query,
        name as ReferenceExpression<DB, TB>,
        value,
      );
    }
  }
  return query;
};
