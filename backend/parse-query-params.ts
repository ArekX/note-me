export const parseQueryParams = <T>(
  url: string,
) => {
  const params = new URL(url).searchParams;
  const result = {} as Record<string, unknown>;
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result as T;
};
