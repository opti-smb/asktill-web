import styles from "./Nav.module.css";

export default function Nav() {
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.inner}`}>
        <a className={styles.brand} href="#top" aria-label="AskTill home">
          <span className={styles.mark} aria-hidden="true">
            AT
          </span>
          <span className={styles.name}>AskTill</span>
        </a>

        <nav className={styles.links} aria-label="Primary">
          <a href="#product">Product</a>
          <a href="#rewards">Rewards</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className={styles.actions}>
          <a className={styles.login} href={`/login`}>
            Log in
          </a>
          <a className={`btn btn-primary ${styles.cta}`} href={`/login`}>
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
