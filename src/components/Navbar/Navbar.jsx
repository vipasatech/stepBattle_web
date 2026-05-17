import styles from "./Navbar.module.css";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import WaitlistModal from "../WaitlistModal/WaitlistModal";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const [modal, setModal] = useState(false);

  return (
    <>
      <WaitlistModal
        open={modal}
        setOpen={setModal}
      />

      <nav className={styles.navbar}>
        <div className={styles.left}>
          <img src="/logo.png" alt="logo" />
          <h1>STEP-BATTLE</h1>
        </div>

        <div className={styles.desktopLinks}>
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#about">About</a>
        </div>

        <button
          className={styles.desktopButton}
          onClick={() => setModal(true)}
        >
          Join Waitlist
        </button>

        <div
          className={styles.mobileMenu}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </div>
      </nav>

      <div
        className={`${styles.mobileDrawer} ${
          open ? styles.showDrawer : ""
        }`}
      >
        <a href="#features">Features</a>
        <a href="#how">How It Works</a>
        <a href="#leaderboard">Leaderboard</a>
        <a href="#about">About</a>

        <button onClick={() => setModal(true)}>
          Join Waitlist
        </button>
      </div>
    </>
  );
}