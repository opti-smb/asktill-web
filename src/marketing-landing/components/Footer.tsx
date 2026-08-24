import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.mark}>AT</span>
          <div>
            <strong>AskTill</strong>
            <p>Financial clarity for small businesses.</p>
          </div>
        </div>

        <div className={styles.cols}>
          <div>
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h4>App</h4>
            <a href={`/login`}>Log in</a>
            <a href={`/login`}>Get started</a>
            <a href="#trust">Security</a>
          </div>
          <div id="policies">
            <h4>Policies</h4>
            <a href="/policies/terms">Terms of Service</a>
            <a href="/policies/privacy">Privacy Policy</a>
            <a href="/policies/security">Security &amp; Trust</a>
            <a href="/policies/vulnerability-disclosure">Vulnerability Disclosure</a>
          </div>
        </div>
      </div>
      <div className={`wrap ${styles.legal}`}>
        <p>© {new Date().getFullYear()} AskTill. All rights reserved.</p>
        <p>
          <a href="#trust">Privacy</a>
          {" · "}
          <a href="#trust">Terms</a>
        </p>
      </div>
    </footer>
  );
}
