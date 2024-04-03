import { SelectQueryBuilder, sql } from "./mod.ts";

export const applyPagination = <DB, TB extends keyof DB, O>(
    query: SelectQueryBuilder<DB, TB, O>,
    page: number,
    perPage: number = 20,
) => {
    return page ? query.limit(perPage).offset(perPage * (page - 1)) : query;
};

export const getSimpleTotalCount = async <DB, TB extends keyof DB, O>(
    query: SelectQueryBuilder<DB, TB, O>,
) => {
    const result = await query
        .clearSelect()
        .select([
            sql<number>`COUNT(*)`.as("total_count"),
        ])
        .executeTakeFirst() as { total_count: number } | undefined;

    return result?.total_count ?? 0;
};

export const pageResults = async <T, DB, TB extends keyof DB, O>(
    query: SelectQueryBuilder<DB, TB, O>,
    page: number,
    perPage: number = 20,
    totalCount?: number,
) => {
    const total = totalCount ? totalCount : await getSimpleTotalCount(query);
    const results = await applyPagination(query, page, perPage).execute();
    return {
        results,
        total,
        page,
        perPage,
    } as Paged<T>;
};

export interface Paged<T> {
    results: T[];
    total: number;
    page: number;
    perPage: number;
}
