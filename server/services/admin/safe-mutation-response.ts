const SENSITIVE_KEY = /password|secret|token|apiKey|authorization|cookie|credential/i;

export function assertSafeAdminMutationResponse(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertSafeAdminMutationResponse(item);
    return;
  }
  if (value === null || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      throw new Error(`Admin mutation response contains a sensitive field: ${key}.`);
    }
    assertSafeAdminMutationResponse(item);
  }
}
