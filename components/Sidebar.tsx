import NavLink from './NavLink';
import styles from './Sidebar.module.css';

export default function Sidebar({ className = '' }: { className?: string }) {
  const classes = [styles.sidebar, className].filter(Boolean).join(' ');

  return (
    <aside className={classes}>
      <nav className={styles.nav}>
        <NavLink href="/lifeengine" className={styles.navLink}>
          Home
        </NavLink>
        <NavLink href="/lifeengine/profiles" className={styles.navLink}>
          Profiles
        </NavLink>
        <NavLink href="/lifeengine/create" className={styles.navLink}>
          Create Plan
        </NavLink>
        <NavLink href="/lifeengine/dashboard" className={styles.navLink}>
          Dashboard
        </NavLink>
        <NavLink href="/lifeengine/diet" className={styles.navLink}>
          Diet Builder
        </NavLink>
        <NavLink href="/lifeengine/yoga" className={styles.navLink}>
          Yoga Planner
        </NavLink>
        <NavLink href="/lifeengine/sleep" className={styles.navLink}>
          Sleep Optimizer
        </NavLink>
        <NavLink href="/lifeengine/habits" className={styles.navLink}>
          Habit Tracker
        </NavLink>
        <NavLink href="/lifeengine/fitness" className={styles.navLink}>
          Fitness &amp; Health
        </NavLink>
        <NavLink href="/lifeengine/fitness/planner" className={styles.navLink}>
          Activity Plan
        </NavLink>
        <NavLink href="/lifeengine/fitness/tracker" className={styles.navLink}>
          Activity Tracker
        </NavLink>
        <NavLink href="/lifeengine/custom-gpt" className={styles.navLink}>
          Using Custom GPT
        </NavLink>
        <NavLink href="/lifeengine/settings" className={styles.navLink}>
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
