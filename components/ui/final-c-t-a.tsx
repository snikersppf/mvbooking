import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { LeadForm } from "@/components/leads/lead-form";
import styles from "./final-c-t-a.module.css";

export type FinalCTAType = {
  className?: string;
};

const FinalCTA: NextPage<FinalCTAType> = async ({ className = "" }) => {
  const t = await getTranslations();
  return (
    <section id="enquiry" className={[styles.finalCta, className].join(" ")}>
      <div className={styles.illustrationtopographicPatte}>
        <div className={styles.container}>
          <Image
            className={styles.groupIcon}
            width={657.7}
            height={244.9}
            sizes="100vw"
            alt=""
            src="/design/Group.svg"
          />
          <b className={styles.eyebrow}>{t("ПОМОЖЕМ С ВЫБОРОМ")}</b>
          <h2 className={styles.title}>
            {t("Не нашли подходящий")}<br />
            {t("автомобиль?")}</h2>
          <div className={styles.body}>
            {t("Начните с выбора автомобиля в каталоге.")}<br />
            {t("Сравните варианты для вашего путешествия.")}</div>
        </div>
        {/* TODO: check connection. Add verified contact links when they are provided. */}
        <Link href="/vehicles" className={styles.catalogueAction}>{t("Перейти в каталог →")}</Link>
      </div>
      <Image
        className={styles.vehicleOnGraphicBackground}
        loading="lazy"
        width={636}
        height={284}
        sizes="100vw"
        alt=""
        src="/design/Product-photo@2x.png"
      />
      <div className={styles.container5}>
        <div className={styles.enquiryForm}><LeadForm /></div>
      </div>
    </section>
  );
};

export default FinalCTA;
