import Spinner from '../common/Spinner';
import { plaidLinkStatusKind } from '../../lib/plaidLinkStatus';

import styles from './PlaidLinkStatusLine.module.css';

type Props = {
  message: string;
};

export default function PlaidLinkStatusLine({ message }: Props) {
  const kind = plaidLinkStatusKind(message);

  if (kind === 'pending') {
    return (
      <div className={styles.pending}>
        <Spinner label={message} size="sm" />
      </div>
    );
  }

  return (
    <p className={kind === 'success' ? styles.ok : styles.err} role="status">
      {kind === 'success' ? (
        <>
          <i className="ti ti-circle-check" aria-hidden />
          {message}
        </>
      ) : (
        <>
          <i className="ti ti-alert-circle" aria-hidden />
          {message}
        </>
      )}
    </p>
  );
}
