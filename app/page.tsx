import { getTranslations } from "@/lib/i18n/server";
import HomeHero from "@/components/ui/home-hero";
import FrameComponent from "@/components/ui/frame-component";
import CatalogueWrapper from "@/components/ui/catalogue-wrapper";
import FrameComponent1 from "@/components/ui/frame-component1";
import FrameComponent11 from "@/components/ui/frame-component11";
import FrameComponent111 from "@/components/ui/frame-component111";
import FrameComponent1111 from "@/components/ui/frame-component1111";
import FinalCTA from "@/components/ui/final-c-t-a";
import Footer from "@/components/ui/footer";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.div}>
      <main>
      <div className={styles.mainContent}>
        <HomeHero />
        <FrameComponent />
      </div>
      <div className={styles.catalogueContainerWrapper}>
        <section className={styles.catalogueContainer}>
          <CatalogueWrapper />
          <FrameComponent1 />
          <FrameComponent11 />
          <FrameComponent111 />
          <FrameComponent1111 />
          <FinalCTA />
        </section>
      </div>
      </main>
      <Footer />
    </div>
  );
}
