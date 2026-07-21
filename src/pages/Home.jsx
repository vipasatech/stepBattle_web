import { useState } from "react";

import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero/Hero";
import Features from "../components/Features/Features";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import AppShowcase from "../components/AppShowcase/AppShowcase";
import Testimonials from "../components/Testimonials/Testimonials";
import Plans from "../components/Plans/Plans";
import CTA from "../components/CTA/CTA";
import Footer from "../components/Footer/Footer";

import WaitlistModal from "../components/WaitlistModal/WaitlistModal";
import SEO from "../seo/SEO";

export default function Home() {
  const [modal, setModal] = useState(false);

  return (
    <>
      <SEO
        title="Walk. Compete. Win."
        description="Join StepBattle to compete in walking challenges, earn XP, climb leaderboards, build healthy habits, and challenge friends worldwide."
        keywords="walking challenge app, fitness challenge app, step tracker, walk with friends, fitness gamification, walking rewards, StepBattle"
        url="https://stepbattle.fit/"
      />

      <WaitlistModal open={modal} setOpen={setModal} />

      <Navbar setModal={setModal} />

      <Hero setModal={setModal} />

      <Features />

      <HowItWorks />

      <AppShowcase />

      <Testimonials />

      <Plans />

      <CTA setModal={setModal} />

      <Footer />
    </>
  );
}