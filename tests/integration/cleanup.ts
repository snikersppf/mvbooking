export async function cleanupTrackedPrefixes(
  prefixes: string[],
  cleanup: (prefix: string) => Promise<void>,
): Promise<void> {
  const failures: unknown[] = [];

  for (const prefix of [...prefixes].reverse()) {
    try {
      await cleanup(prefix);
      const index = prefixes.indexOf(prefix);
      if (index >= 0) prefixes.splice(index, 1);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      "Failed to clean up integration-test prefixes.",
    );
  }
}
