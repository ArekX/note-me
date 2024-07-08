import {
    ExpressionBuilder,
    ExpressionWrapper,
    ReferenceExpression,
    SelectQueryBuilder,
    SqlBool,
} from "./deps.ts";

export const getTextExpression = <DB, TB extends keyof DB, O>(
    expression: ExpressionBuilder<DB, TB>,
    filter: FilterSpec<DB, TB>,
) => {
    if (!filter.value) {
        return null;
    }

    return expression(
        filter.field,
        filter.inverted ? "not like" : "like",
        `%${filter.value}%`,
    );
};

export const getValueExpression = <DB, TB extends keyof DB, O, V>(
    expression: ExpressionBuilder<DB, TB>,
    filter: FilterSpec<DB, TB>,
) => {
    if (!filter.value) {
        return null;
    }

    const operator = filter.inverted
        ? (Array.isArray(filter.value) ? "not in" : "!=")
        : (Array.isArray(filter.value) ? "in" : "=");

    return expression(filter.field, operator, filter.value);
};

type FilterSpec<DB, TB extends keyof DB> = {
    field: ReferenceExpression<DB, TB>;
    type?: "text" | "value";
    value: unknown;
    inverted?: boolean;
};

type CustomFilter<DB, TB extends keyof DB, V = SqlBool> = {
    type: "custom";
    value: (
        builder: ExpressionBuilder<DB, TB>,
    ) => ExpressionWrapper<DB, TB, V> | null;
};

interface FilterOptions {
    filterGlueType?: "and" | "or";
}

export const applyFilters = <DB, TB extends keyof DB, O>(
    query: SelectQueryBuilder<DB, TB, O>,
    filters: (FilterSpec<DB, TB> | CustomFilter<DB, TB>)[],
    {
        filterGlueType = "and",
    }: FilterOptions = {},
) => {
    return query.where(({ eb, and, or }) => {
        const conditions = [];

        for (
            const filter of filters
        ) {
            let expression;

            if (filter.type === "text") {
                expression = getTextExpression(eb, filter);
            } else if (filter.type === "value") {
                expression = getValueExpression(eb, filter);
            } else if (filter.type === "custom") {
                expression = filter.value(eb);
            }

            if (expression) {
                conditions.push(expression);
            }
        }

        if (filterGlueType === "or") {
            return or(conditions);
        }

        return and(conditions);
    });
};
