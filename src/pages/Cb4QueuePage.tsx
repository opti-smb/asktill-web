import { Link } from 'react-router-dom';
import DecisionQueue from '../components/cb4/DecisionQueue';
import cb4 from './Cb4Pages.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

export default function Cb4QueuePage() {
  return (
    <div className={cb4.page}>
      <div className={cb4.main}>
        <Link to="/dashboard/chargebacks" className={cb4.back}>
          ← Money Reclaimed
        </Link>
        <h1 className={headerStyles.h1}>Decision queue</h1>
        <p className={cb4.lead}>
          Analyst and reviewer work queue. Priority is time remaining, then amount. It does not
          change the final decision.
        </p>
        <DecisionQueue />
      </div>
    </div>
  );
}
