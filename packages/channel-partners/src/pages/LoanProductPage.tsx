import { Link, useParams } from 'react-router-dom';

import BankLogo from '../components/BankLogo';
import { getLoanProduct } from '../data/loans';
import styles from '../styles/channelPartners.module.css';

export default function LoanProductPage() {
  const { productId = '' } = useParams();
  const product = getLoanProduct(productId);

  if (!product) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>Loan product not found.</p>
        <Link to=".." className={styles.backLink}>
          ← Back to loans
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <Link to="../..">Channel partners</Link>
        <span className={styles.crumbSep}>/</span>
        <Link to="..">Loans</Link>
        <span className={styles.crumbSep}>/</span>
        <span>{product.name}</span>
      </nav>

      <h2 className={styles.pageTitle}>{product.name}</h2>
      <p className={styles.lead}>{product.tagline}</p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Amount</span>
          <span className={styles.statValue}>{product.amountRange}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Interest from</span>
          <span className={styles.statValue}>{product.rateFrom}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Tenure</span>
          <span className={styles.statValue}>{product.tenure}</span>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.infoStack}>
          <div className={styles.panel}>
            <h3>Highlights</h3>
            <ul>
              {product.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.panel}>
            <h3>Eligibility</h3>
            <ul>
              {product.eligibility.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.panel}>
            <h3>Documents</h3>
            <ul>
              {product.documents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>
            Partner banks for {product.name}
          </h3>
          <p className={styles.sectionHint}>
            Lenders for this product only — rates and limits differ by loan type. Click a bank to
            open its official page.
          </p>
          <ul className={styles.bankList}>
            {product.banks.map((bank) => (
              <li key={bank.id}>
                <a
                  className={styles.bankRow}
                  href={bank.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.bankIdentity}>
                    <BankLogo bank={bank} />
                    <span className={styles.bankName}>{bank.name}</span>
                  </span>
                  <span className={styles.bankMeta}>
                    <span className={styles.bankMetaLabel}>Rate from</span>
                    <span className={styles.bankMetaValue}>{bank.rateFrom}</span>
                  </span>
                  <span className={styles.bankMeta}>
                    <span className={styles.bankMetaLabel}>Amount</span>
                    <span className={styles.bankMetaValue}>{bank.amountUpTo}</span>
                  </span>
                  <span className={styles.bankMeta}>
                    <span className={styles.bankMetaLabel}>Fee</span>
                    <span className={styles.bankMetaValue}>{bank.processingFee}</span>
                  </span>
                  <span className={styles.applyBtn}>Apply</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
