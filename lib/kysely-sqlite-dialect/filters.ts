import {
    ReferenceExpression,
    SelectQueryBuilder,
    StringReference,
} from "./deps.ts";

export const filterByText = <DB, TB extends keyof DB, O>(
    query: SelectQueryBuilder<DB, TB, O>,
    name: ReferenceExpression<DB, TB>,
    inverted: boolean,
    value?: string,
) => {
    if (!value) {
        return query;
    }
    return query.where(name, inverted ? "not like" : "like", `%${value}%`);
};

export const filterByValue = <DB, TB extends keyof DB, O, V>(
    query: SelectQueryBuilder<DB, TB, O>,
    name: ReferenceExpression<DB, TB>,
    inverted: boolean,
    value?: V,
) => {
    if (!value) {
        return query;
    }

    const operator = inverted
        ? (Array.isArray(value) ? "not in" : "!=")
        : (Array.isArray(value) ? "in" : "=");

    return query.where(name, operator, value);
};

type FilterSpec<DB, TB extends keyof DB> = {
    field: StringReference<DB, TB>;
    type?: "text" | "value";
    value: unknown;
    inverted?: boolean;
};

export const applyFilters = <DB, TB extends keyof DB, O>(
    query: SelectQueryBuilder<DB, TB, O>,
    filters: FilterSpec<DB, TB>[],
) => {
    for (const { field, type = "text", value, inverted = false } of filters) {
        if (type === "text") {
            query = filterByText(
                query,
                field,
                inverted,
                value as string,
            );
        } else if (type === "value") {
            query = filterByValue(
                query,
                field,
                inverted,
                value,
            );
        }
    }
    return query;
};
