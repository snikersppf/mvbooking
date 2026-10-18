import { PassThrough } from "node:stream";
import { createElement, type ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { LanguageProvider } from "@/components/i18n/language-provider";
import type { Locale } from "@/lib/i18n/translate";

// Async server components need the streaming renderer, even when a test only
// inspects the final HTML. Client components receive the same locale as the page.
export function renderLocalizedPage(children: ReactNode, locale: Locale = "en"): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    let html = "";
    output.on("data", (chunk: Buffer) => { html += chunk.toString(); });
    output.on("end", () => resolve(html));
    output.on("error", reject);
    const stream = renderToPipeableStream(
      createElement(LanguageProvider, { initialLocale: locale }, children),
      { onAllReady: () => stream.pipe(output), onError: reject },
    );
  });
}
