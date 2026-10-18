import { describe, expect, it } from "vitest";
import { createTranslator, normalizeLocale } from "@/lib/i18n/translate";
import { formatBookingDateTime } from "@/lib/booking-view";

describe("interface localization", () => {
  it("defaults to Russian and accepts only supported locale values", () => {
    expect(normalizeLocale(undefined)).toBe("ru");
    expect(normalizeLocale("de")).toBe("ru");
    expect(normalizeLocale("en")).toBe("en");
  });

  it("translates existing English and Russian copy in both directions", () => {
    const ru = createTranslator("ru");
    const en = createTranslator("en");
    expect(ru("Check price")).toBe("Проверить стоимость");
    expect(en("Забронировать автомобиль →")).toBe("Book this car →");
    expect(en("Страховка")).toBe("Insurance");
    expect(ru("Vehicle")).toBe("Автомобиль");
    expect(ru("Transmission")).toBe("Коробка передач");
    expect(en("Доставка")).toBe("Vehicle");
    expect(ru("Доставка")).toBe("Доставка");
    expect(ru("  Check price ")).toBe("  Проверить стоимость ");
    expect(ru("Укажите даты поездки и нажмите «Check price», чтобы узнать стоимость и доступность.")).not.toMatch(/Check price/);
  });

  it("localizes enum labels while leaving original codes and user data intact", () => {
    const ru = createTranslator("ru");
    const en = createTranslator("en");
    const code = "AUTOMATIC";
    expect(ru(code)).toBe("Автомат");
    expect(en(code)).toBe("Automatic");
    expect(code).toBe("AUTOMATIC");
    expect(ru("AWD")).toBe("Полный");
    expect(ru("CONFIRMED")).toBe("Подтверждено");
    expect(ru("Toyota RAV4")).toBe("Toyota RAV4");
    expect(en("Мой личный комментарий")).toBe("Мой личный комментарий");
    expect(ru(undefined)).toBe("");
  });

  it("preserves limits and retry times when displaying existing validation messages", () => {
    const ru = createTranslator("ru");
    expect(ru.error("The rental period cannot exceed 30 days.")).toBe("Срок аренды не может превышать 30 дней.");
    expect(ru.error("Too many requests. Try again in 42 seconds.")).toBe("Слишком много запросов. Повторите через 42 сек.");
    expect(ru.error("Too big: expected string to have <=100 characters")).toBe("Введите не более 100 символов.");
    expect(ru.error("Year must be between 1980 and 2027.")).toBe("Год: укажите число от 1980 до 2027.");
    expect(ru.error("Enter a brand. Enter a model.")).toBe("Укажите марку. Укажите модель.");
    expect(ru.error("Unexpected server response")).toBe("Проверьте введённые данные и повторите попытку.");
  });

  it("changes date presentation without changing the date or time zone", () => {
    const value = "2026-01-10T10:00:00.000Z";
    const ru = formatBookingDateTime(value, "Asia/Tbilisi", "ru");
    const en = formatBookingDateTime(value, "Asia/Tbilisi", "en");
    expect(ru).toContain("янв.");
    expect(ru).toContain("14:00");
    expect(en).toContain("Jan");
    expect(en).toContain("2:00 PM");
    expect(formatBookingDateTime(value, "Asia/Tbilisi")).toBe(en);
  });
});
