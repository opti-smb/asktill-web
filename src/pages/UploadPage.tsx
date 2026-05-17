import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import FileDropZone from '../components/upload/FileDropZone';
import type { FileUploadState } from '../types';
import styles from './UploadPage.module.css';

type FormData = Record<string, FileList>;

const bankState: FileUploadState = {
  uploaded: true,
  fileName: 'chase_business_mar2026.pdf',
  detail: '214 transactions detected',
};

const posState: FileUploadState = {
  uploaded: true,
  fileName: 'square_mar2026.csv',
  detail: 'Square POS detected · 31 days',
};

const ecommerceState: FileUploadState = {
  uploaded: false,
};

const steps = [
  { label: 'Account', status: 'done' },
  { label: 'Upload data', status: 'active' },
  { label: 'Confirm sources', status: '' },
  { label: 'First insight', status: '' },
];

export default function UploadPage() {
  const { register } = useForm<FormData>();
  const navigate = useNavigate();

  return (
    <div className={styles.pageBg}>
      <nav className={styles.nav}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo />
            <div className={styles.navUser}>
              <span>Maria's Café</span>
              <div className={styles.avatar}>M</div>
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.stepper}>
        <div className="wrap">
          <div className={styles.stepperInner}>
            {steps.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {i > 0 && <div className={styles.stepDivider} />}
                <div className={`${styles.stepPill} ${step.status ? styles[step.status] : ''}`}>
                  <span className={styles.stepNum}>
                    {step.status === 'done' ? '✓' : i + 1}
                  </span>
                  <span className={styles.stepLabel}>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.page}>
        <div className="wrap">
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Step 2 of 4</span>
            <h1>Connect <em>your three sources.</em></h1>
            <p className={styles.pageSub}>
              Drop in your bank statement, POS export, and ecommerce file. PDFs and CSVs both work. We'll do the rest.
            </p>
          </div>

          <div className={styles.uploadGrid}>
            <FileDropZone
              name="bank"
              label="Bank statement"
              subLabel="Most major US banks supported"
              uploadState={bankState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              register={register}
            />
            <FileDropZone
              name="pos"
              label="POS export"
              subLabel="Square, Toast, Clover, more"
              uploadState={posState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              register={register}
            />
            <FileDropZone
              name="ecommerce"
              label="Ecommerce"
              subLabel="Shopify, Stripe, WooCommerce"
              uploadState={ecommerceState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                </svg>
              }
              register={register}
            />
          </div>

          <div className={styles.privacy}>
            <div className={styles.privacyIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={styles.privacyText}>
              <strong>Your data stays your data.</strong> Encrypted at rest and in transit. Personal details (account numbers, customer names) are tokenized before analysis — our team never sees them in the clear.
            </div>
          </div>

          <div className={styles.ctaWrap}>
            <button
              className={styles.btnPrimary}
              onClick={() => navigate('/dashboard/overview')}
            >
              Continue to confirmation
              <span>→</span>
            </button>
            <div className={styles.micro}>2 of 3 sources uploaded · 1 more to unlock full reconciliation</div>
          </div>

          <div className={styles.helpLink}>
            Don't have your files handy? <a href="#">See where to download them →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
