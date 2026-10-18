import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component111.module.css";

export type FrameComponent111Type = {
  className?: string;
};

const FrameComponent111: NextPage<FrameComponent111Type> = ({
  className = "",
}) => {
  return (
    <div className={[styles.georgiaStoryWrapper, className].join(" ")}>
      <div className={styles.georgiaStory}>
        <Image
          className={styles.cohesiveCoastalPhoto}
          width={1280}
          height={427}
          sizes="100vw"
          alt=""
          src="/Editorial-photo1@2x.png"
        />
        <section className={styles.storyContent}>
          <b className={styles.eyebrow}>БОЛЬШЕ, ЧЕМ ПРОСТО АРЕНДА</b>
          <div className={styles.container}>
            <h1 className={styles.title}>
              Грузия ближе,
              <br />
              когда вы за рулём
            </h1>
            <div className={styles.description}>
              Остановитесь там, где захотите.
              <br />
              Меняйте маршрут по пути. Открывайте
              <br />
              города, горы и побережье
              <br />в собственном ритме.
            </div>
          </div>
          <button className={styles.buttonprimary}>
            <div className={styles.container2}>
              <b className={styles.label}>Выбрать автомобиль</b>
            </div>
            <Image
              className={styles.iconarrowRight}
              width={24}
              height={24}
              sizes="100vw"
              alt=""
              src="/Icon-arrow-right1.svg"
            />
          </button>
        </section>
      </div>
    </div>
  );
};

export default FrameComponent111;
