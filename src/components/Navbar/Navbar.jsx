import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import styles from "./Navbar.module.css";

// One source of truth for tab order — used by the desktop nav, the
// mobile drawer, AND the scroll-spy observer. Order matters: matches
// visual top-to-bottom order of the corresponding sections on Home.
const NAV_ITEMS = [
  { id: "features", label: "Features" },
  { id: "how", label: "How It Works" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "about", label: "About" },
  { id: "plans", label: "Plans" },
];

export default function Navbar({ setModal }) {
  const [open, setOpen] = useState(false);
  const activeId = useScrollSpy(NAV_ITEMS.map((i) => i.id));

  return (
    <>
      <nav className={styles.navbar}>
        <a href="#" className={styles.left}>
          <img src="/logo.png" alt="logo" />
          <h1>STEP-BATTLE</h1>
        </a>

        <div className={styles.desktopLinks}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={activeId === item.id ? styles.active : ""}
            >
              {item.label}
            </a>
          ))}
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
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={activeId === item.id ? styles.active : ""}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </a>
        ))}

        <button
          onClick={() => {
            setModal(true);
            setOpen(false);
          }}
        >
          Join Waitlist
        </button>
      </div>
    </>
  );
}

/// IntersectionObserver-backed scroll-spy. Given a list of DOM ids,
/// returns the id whose section is currently "most visible" — with
/// a bias for the section closest to the top of the viewport, so
/// that landing on a tall section highlights it early rather than
/// waiting for the reader to scroll to its midpoint.
///
/// Observer is created once and refreshed if the id list changes.
function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(ids[0] ?? null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (elements.length === 0) return;

    // Track intersection ratios; on each callback, pick the id
    // with the largest ratio that's still >0.
    const ratios = new Map(elements.map((el) => [el.id, 0]));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio);
        }
        let best = { id: null, ratio: 0 };
        for (const [id, ratio] of ratios.entries()) {
          if (ratio > best.ratio) best = { id, ratio };
        }
        if (best.id && best.id !== activeId) setActiveId(best.id);
      },
      {
        // The rootMargin trims the top by the navbar height so a
        // section is considered "in view" only once it's actually
        // visible under the nav, not while it's behind it.
        rootMargin: "-90px 0px -35% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return activeId;
}
