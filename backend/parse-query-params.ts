export type ParamSchema<T> = {
  [K in keyof T]: TypeData;
};

interface TypeData {
  type: "string" | "number" | "boolean";
  optional?: boolean;
}

export const parseQueryParams = <T>(
  url: string,
  schema: ParamSchema<T>,
) => {
  const params = new URL(url).searchParams;
  const result = {} as Record<string, unknown>;
  for (const [key, typeData] of Object.entries<TypeData>(schema)) {
    let value: string | number | boolean | null = params.get(key);

    if (value === null) {
      if (typeData.optional) {
        continue;
      }
      throw new Error(`Missing required param: ${key}`);
    }

    switch (typeData.type) {
      case "string":
        break;
      case "number":
        value = +value;
        break;
      case "boolean":
        value = value === "true";
        break;
    }

    result[key] = value;
  }
  return result as T;
};
