import { useState } from "react";

import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero/Hero";
import Features from "../components/Features/Features";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import AppShowcase from "../components/AppShowcase/AppShowcase";
import Testimonials from "../components/Testimonials/Testimonials";
import CTA from "../components/CTA/CTA";
import Footer from "../components/Footer/Footer";

import WaitlistModal from "../components/WaitlistModal/WaitlistModal";

export default function Home() {
  const [modal, setModal] = useState(false);

  return (
    <>
      <WaitlistModal
        open={modal}
        setOpen={setModal}
      />

      <Navbar setModal={setModal} />

      <Hero setModal={setModal} />

      <Features />

      <HowItWorks />

      <AppShowcase />

      <Testimonials />

      <CTA setModal={setModal} />

      <Footer />
    </>
  );
}