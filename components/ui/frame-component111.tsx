import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./frame-component111.module.css";

export type FrameComponent111Type = {
  className?: string;
};

const FrameComponent111: NextPage<FrameComponent111Type> = async ({
  className = "",
}) => {
  const t = await getTranslations();
  return (
    <div className={[styles.georgiaStoryWrapper, className].join(" ")}>
      <div className={styles.georgiaStory}>
        <Image
          className={styles.cohesiveCoastalPhoto}
          fill
          sizes="100vw"
          alt=""
          src="/design/Editorial-photo1@2x.png"
        />
        <section className={styles.storyContent}>
          <b className={styles.eyebrow}>{t("БОЛЬШЕ, ЧЕМ ПРОСТО АРЕНДА")}</b>
          <div className={styles.container}>
            <h2 className={styles.title}>
              {t("Грузия ближе,")}<br />
              {t("когда вы за рулём")}</h2>
            <div className={styles.description}>
              {t("Остановитесь там, где захотите.")}<br />
              {t("Меняйте маршрут по пути. Открывайте")}<br />
              {t("города, горы и побережье")}<br />{t("в собственном ритме.")}</div>
          </div>
          <Link href="/vehicles" className={styles.buttonprimary}>
            <div className={styles.container2}>
              <b className={styles.label}>{t("Выбрать автомобиль")}</b>
            </div>
            <Image
              className={styles.iconarrowRight}
              width={24}
              height={24}
              sizes="100vw"
              alt=""
              src="/design/Icon-arrow-right1.svg"
            />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default FrameComponent111;
