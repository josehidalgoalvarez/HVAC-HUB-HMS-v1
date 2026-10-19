import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Global & Section-level Error Boundary.
 * Catches render exceptions and presents a clean recovery interface with diagnostic info
 * instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[HVACHome ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleResetAndReload = () => {
    try {
      sessionStorage.clear();
      // Remove stale app state while preserving non-transient storage if needed
      sessionStorage.removeItem('pt_activeView');
      sessionStorage.removeItem('pt_selectedPropertyId');
      sessionStorage.removeItem('pt_selectedApplianceId');
      sessionStorage.removeItem('pt_isEditMode');
    } catch {
      // ignore storage access errors
    }
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unknown render error occurred.';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="max-w-md w-full bg-card-light dark:bg-card-dark rounded-3xl p-6 shadow-2xl border border-red-200 dark:border-red-900/40 text-text-main-light dark:text-text-main-dark">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50 dark:ring-red-950/30">
              <span className="material-symbols-outlined text-[30px]">warning</span>
            </div>

            <h2 className="text-xl font-bold text-brand-black dark:text-white mb-2">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>

            <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-4">
              An unexpected render error occurred in this view.
            </p>

            <div className="text-left bg-gray-50 dark:bg-black/50 rounded-xl p-3 border border-gray-200 dark:border-gray-800 mb-4 overflow-hidden">
              <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400 break-words">
                {errorMsg}
              </div>

              {componentStack && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={this.toggleDetails}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>{this.state.showDetails ? 'Hide Details' : 'Show Component Trace'}</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {this.state.showDetails ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {this.state.showDetails && (
                    <pre className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 overflow-x-auto max-h-48 whitespace-pre-wrap font-mono">
                      {componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={this.handleTryAgain}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-800 text-brand-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Try Again
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:opacity-90 transition shadow-lg shadow-primary/20"
              >
                Reset &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
