import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import Component1111 from "./component1111";
import styles from "./frame-component11.module.css";

export type FrameComponent11Type = {
  className?: string;
};

const FrameComponent11: NextPage<FrameComponent11Type> = async ({
  className = "",
}) => {
  const t = await getTranslations();
  return (
    <section id="how-it-works" className={[styles.containerParent, className].join(" ")}>
      <div className={styles.container}>
        <b className={styles.eyebrow}>{t("ВСЁ ПРОСТО")}</b>
        <h2 className={styles.sectionTitle}>
          {t("От выбора автомобиля до начала путешествия")}</h2>
      </div>
      <ol className={styles.list}>
        <Component1111 number="01" icon="car" label={`${t("Выберите")}\n${t("автомобиль")}`} />
        <Component1111 number="02" icon="calendar" label={t(`Укажите
маршрут и даты`)} />
        <Component1111 number="03" icon="document" label={t(`Оставьте
контакты`)} />
        <Component1111 number="04" icon="check" label={t(`Получите
подтверждение`)} />
        <Component1111 number="05" icon="send" label={t(`Отправляйтесь
в путь`)} />
      </ol>
    </section>
  );
};

export default FrameComponent11;
