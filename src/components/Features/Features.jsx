import styles from "./Features.module.css";
import {
  Footprints,
  Trophy,
  Flame,
  Users,
  BarChart3,
  Target,
} from "lucide-react";

const features = [
  {
    icon: <Footprints size={34} />,
    title: "Step Tracking",
    desc: "Track every step in real-time with accurate activity monitoring.",
  },
  {
    icon: <Trophy size={34} />,
    title: "Daily Battles",
    desc: "Challenge friends and compete in step-based fitness battles.",
  },
  {
    icon: <Flame size={34} />,
    title: "Streak System",
    desc: "Maintain consistency with daily streak rewards and achievements.",
  },
  {
    icon: <Users size={34} />,
    title: "Social Fitness",
    desc: "Compete with friends, teams, and community leaderboards.",
  },
  {
    icon: <BarChart3 size={34} />,
    title: "Performance Insights",
    desc: "Visualize your fitness growth with smart activity analytics.",
  },
  {
    icon: <Target size={34} />,
    title: "Goals & Rewards",
    desc: "Unlock badges, rewards, and milestones as you stay active.",
  },
];

export default function Features() {
  return (
    <section id ="features" className={styles.features}>
      <div className={styles.top}>
        <p>FEATURES</p>

        <h2>
          Built To Make Fitness
          <span> Competitive.</span>
        </h2>

        <h3>
          Everything you need to stay motivated,
          active, and consistent every day.
        </h3>
      </div>

      <div className={styles.grid}>
        {features.map((item, index) => (
          <div className={styles.card} key={index}>
            <div className={styles.icon}>
              {item.icon}
            </div>

            <h4>{item.title}</h4>

            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}