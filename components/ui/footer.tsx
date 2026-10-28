import { getTranslations } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import styles from "./footer.module.css";

export default async function Footer() {
  const t = await getTranslations();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <Link href="/" aria-label="MVBooking"><Image src="/design/MASTER-VADYA-PNG-logo@2x.png" alt="MVBooking" width={444} height={69} /></Link>
          <p className={styles.brandCopy}>{t("Аренда автомобилей для путешествий по Грузии без лишних сложностей.")}</p>
        </div>
        <nav aria-label={t("Навигация")}>
          <b>{t("Навигация")}</b>
          <Link href="/vehicles">{t("Автомобили")}</Link>
          <Link href="#rental-conditions">{t("Условия аренды")}</Link>
          <Link href="#how-it-works">{t("Как это работает")}</Link>
        </nav>
        <nav aria-label={t("Staff")}>
          <b>{t("Staff")}</b>
          <Link href="/login">{t("Staff sign in")}</Link>
        </nav>
      </div>
      <div className={styles.footerLegal}>{t("MVBooking · Аренда автомобилей в Грузии")}</div>
    </footer>
  );
}
