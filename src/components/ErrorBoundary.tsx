import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/** Catches render-time exceptions so the app shows recovery UI instead of a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            background: '#f7f5f2',
            color: '#1a1a1a',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ marginBottom: '1.25rem', lineHeight: 1.5, opacity: 0.85 }}>
              The page hit an unexpected error. Your session is still on this device — try
              reloading.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 8,
                border: 'none',
                background: '#1a1a1a',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reload AskTill
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
