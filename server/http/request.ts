import { ApiRequestError } from "@/server/http/api-response";

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiRequestError(400, "INVALID_JSON", "errors.invalidJson");
  }
}

export function queryParamsToObject(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams) {
    const existing = result[key];
    if (existing === undefined) result[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else result[key] = [existing, value];
  }

  return result;
}
