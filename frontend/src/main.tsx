import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { ConfirmProvider } from './components/ConfirmContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, backgroundColor: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Something went wrong.</h1>
          <details open style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            style={{ marginTop: 20, padding: '10px 20px', background: '#991b1b', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
            onClick={() => {
              localStorage.removeItem('invoice_maker_biz_profile');
              window.location.reload();
            }}
          >
            Reset Profile & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main React mounting layer
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ErrorBoundary>
  </StrictMode>,
);
