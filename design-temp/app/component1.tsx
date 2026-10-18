import type { NextPage } from "next";
import Header from "../components/header";
import HomeHero from "../components/home-hero";
import FrameComponent from "../components/frame-component";
import CatalogueWrapper from "../components/catalogue-wrapper";
import FrameComponent1 from "../components/frame-component1";
import FrameComponent11 from "../components/frame-component11";
import FrameComponent111 from "../components/frame-component111";
import FrameComponent1111 from "../components/frame-component1111";
import FinalCTA from "../components/final-c-t-a";
import Footer from "../components/footer";
import styles from "./component1.module.css";

const Component1: NextPage = () => {
  return (
    <div className={styles.div}>
      <Header />
      <div className={styles.mainContent}>
        <HomeHero />
        <FrameComponent />
      </div>
      <main className={styles.catalogueContainerWrapper}>
        <section className={styles.catalogueContainer}>
          <CatalogueWrapper />
          <FrameComponent1 />
          <FrameComponent11 />
          <FrameComponent111 />
          <FrameComponent1111 />
          <FinalCTA />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Component1;
