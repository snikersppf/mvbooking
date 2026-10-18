import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createTranslator, LOCALE_COOKIE, normalizeLocale } from "./translate";

export const getLocale = cache(async () => {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
});

export const getTranslations = cache(async () => createTranslator(await getLocale()));
