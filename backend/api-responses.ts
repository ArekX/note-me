import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

export const toCreated = <T>(result: T) =>
    new Response(JSON.stringify(result), {
        status: 201,
    });

export const toUpdated = (success: boolean) =>
    new Response(
        JSON.stringify({
            success,
        }),
        {
            status: 200,
        },
    );

export const toDeleted = () =>
    new Response(null, {
        status: 204,
    });

export const toResultList = <T>(results: T[]) =>
    new Response(
        JSON.stringify(results),
        {
            status: 200,
        },
    );

export const toPagedList = <T>(value: Paged<T>) =>
    new Response(JSON.stringify(value), {
        status: 200,
    });
