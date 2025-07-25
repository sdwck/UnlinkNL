import { Outlet, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import styles from './Layout.module.css';

const MainLayout = () => {
  return (
    <div className={styles.appContainer}>
      <nav className={styles.navbar}>
        <h1 className={styles.logo}>UnlinkNL</h1>
        <ul className={styles.navList}>
          <li>
            <NavLink to="/" className={({ isActive }) => clsx(styles.navLink, isActive && styles.activeLink)}>
              Main
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => clsx(styles.navLink, isActive && styles.activeLink)}>
              Settings
            </NavLink>
          </li>
        </ul>
      </nav>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;