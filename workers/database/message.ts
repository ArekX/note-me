export interface DbRequest<
    T extends string = string,
    Kind extends string = string,
    Key extends string = string,
    Data = unknown,
    Response = unknown,
> {
    name: T;
    kind: Kind;
    key: Key;
    data: Data;
    response: Response;
}

export type DbHandlerMap<T extends DbRequest> = {
    [K in T["key"]]: (
        data: Extract<T, { key: K }>["data"],
    ) => Promise<Extract<T, { key: K }>["response"]>;
};
