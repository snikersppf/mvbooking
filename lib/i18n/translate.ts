import { translations } from "./messages";

export type Locale = "ru" | "en";
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "mvbooking_locale";

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

const dictionary = new Map<string, Readonly<{ en: string; ru: string }>>();
for (const [en, ru] of translations) {
  // Keep the first canonical label when different source phrases share a
  // translation. Their own source keys still retain the original wording.
  if (!dictionary.has(en)) dictionary.set(en, { en, ru });
  if (!dictionary.has(ru)) dictionary.set(ru, { en, ru });
}

const aliases: Readonly<Record<string, string>> = {
  AUTOMATIC: "Automatic", MANUAL: "Manual", PETROL: "Petrol", DIESEL: "Diesel",
  HYBRID: "Hybrid", ELECTRIC: "Electric", FWD: "Front-wheel drive", Fwd: "Front-wheel drive",
  RWD: "Rear-wheel drive", Rwd: "Rear-wheel drive", AWD: "All-wheel drive", Awd: "All-wheel drive",
  "4WD": "Four-wheel drive", "4wd": "Four-wheel drive", Suv: "SUV",
  "Укажите даты поездки и нажмите «Check price», чтобы узнать стоимость и доступность.":
    "Укажите даты поездки и нажмите «Проверить стоимость», чтобы узнать стоимость и доступность.",
};

function translateCore(source: string, locale: Locale): string {
  const key = aliases[source] ?? source;
  const entry = dictionary.get(key) ?? dictionary.get(key.charAt(0) + key.slice(1).toLowerCase());
  if (entry) return entry[locale];

  // Existing validators continue to produce their original messages. Only their
  // presentation is localized, including limits embedded in those messages.
  if (locale === "ru") {
    const limit = /^Use no more than (\d+) characters\.$/.exec(source);
    if (limit) return `Используйте не более ${limit[1]} символов.`;
    const duration = /^The rental period cannot exceed (\d+) days\.$/.exec(source);
    if (duration) return `Срок аренды не может превышать ${duration[1]} дней.`;
    const retry = /^Too many requests\. Try again in (\d+) seconds\.$/.exec(source);
    if (retry) return `Слишком много запросов. Повторите через ${retry[1]} сек.`;
    const integer = /^(.+) must be a whole number\.$/.exec(source);
    if (integer) return `${translateCore(integer[1], locale)}: введите целое число.`;
    const range = /^(.+) must be between (\d+) and (\d+)\.$/.exec(source);
    if (range) return `${translateCore(range[1], locale)}: укажите число от ${range[2]} до ${range[3]}.`;
    const stringLimit = /^Too (big|small): expected string to have (?:<=|>=)(\d+) characters$/.exec(source);
    if (stringLimit) return `Введите ${stringLimit[1] === "big" ? "не более" : "не менее"} ${stringLimit[2]} символов.`;
    const arrayLimit = /^Too (big|small): expected array to have (?:<=|>=)(\d+) items$/.exec(source);
    if (arrayLimit) return `Укажите ${arrayLimit[1] === "big" ? "не более" : "не менее"} ${arrayLimit[2]} элементов.`;
    if (/^Invalid option:|^Invalid enum value/.test(source)) return "Выберите значение из списка.";
    if (/^Invalid input:/.test(source)) return "Проверьте значение поля.";
    const days = /^(\d+(?:[–-]\d+|\+)?) days$/.exec(source);
    if (days) return `${days[1]} дн.`;
    const rentalDescription = /^(.+) for rental in Georgia\.$/.exec(source);
    if (rentalDescription) return `${rentalDescription[1]} для аренды в Грузии.`;
    if (/^\d+(?:\.\d+)?L(?: hybrid)?$/.test(source)) return source.replace("L", " л").replace("hybrid", "гибрид");
  }
  // Names, user comments and arbitrary stored content are data, not UI labels.
  return source;
}

export type Translator = ((source: string | null | undefined) => string) & Readonly<{
  locale: Locale;
  error: (source: string | null | undefined) => string;
}>;

export function createTranslator(locale: Locale): Translator {
  const translate = (source: string | null | undefined): string => {
    if (!source) return "";
    const trimmed = source.trim();
    const translated = translateCore(trimmed, locale);
    return source.slice(0, source.indexOf(trimmed)) + translated + source.slice(source.indexOf(trimmed) + trimmed.length);
  };
  const error = (source: string | null | undefined): string => {
    if (!source) return "";
    const result = translate(source);
    if (locale === "en" || result !== source) return result;
    const sentences = source.split(/(?<=\.)\s+(?=[A-Z])/);
    if (sentences.length > 1) return sentences.map(error).join(" ");
    return /[a-z]/i.test(result)
      ? translate("Check the entered information and try again.")
      : result;
  };
  return Object.assign(translate, { locale, error });
}
