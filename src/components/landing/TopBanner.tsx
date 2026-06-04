import styles from './landingV2.module.css';

export default function TopBanner() {
  return (
    <div className={styles.banner}>
      <div className="wrap">
        AT Rewards is live — earn points on every analysis and every product.{' '}
        <a href="#rewards">Learn more →</a>
      </div>
    </div>
  );
}
