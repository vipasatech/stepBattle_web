import styles from "./HowItWorks.module.css";
import {
  Smartphone,
  Footprints,
  Trophy,
  Medal,
} from "lucide-react";

const steps = [
  {
    icon: <Smartphone size={34} />,
    title: "Create Your Account",
    desc: "Sign up, connect your activity tracking, and personalize your profile.",
  },
  {
    icon: <Footprints size={34} />,
    title: "Track Daily Steps",
    desc: "Automatically monitor your movement and step activity in real-time.",
  },
  {
    icon: <Trophy size={34} />,
    title: "Battle Friends",
    desc: "Challenge friends, join competitions, and climb global leaderboards.",
  },
  {
    icon: <Medal size={34} />,
    title: "Earn Rewards",
    desc: "Unlock streaks, achievements, badges, and milestone rewards.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className={styles.wrapper}>
      <div className={styles.top}>
        <p>HOW IT WORKS</p>

        <h2>
          Fitness Made
          <span> Addictive.</span>
        </h2>

        <h3>
          STEP-BATTLE transforms daily walking into
          social competition and motivation.
        </h3>
      </div>

      <div className={styles.timeline}>
        {steps.map((item, index) => (
          <div className={styles.step} key={index}>
            <div className={styles.line}></div>

            <div className={styles.icon}>
              {item.icon}
            </div>

            <div className={styles.content}>
              <span>0{index + 1}</span>

              <h4>{item.title}</h4>

              <p>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}