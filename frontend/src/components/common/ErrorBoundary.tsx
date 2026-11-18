/**
 * JobGuard AI - React Error Boundary
 * Module: frontend.src.components.common.ErrorBoundary
 * Purpose: Gracefully catches unexpected runtime rendering errors in child routes
 *          so the application never crashes to a blank white screen.
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[JobGuard UI ErrorBoundary]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto my-12 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Something went wrong displaying this view
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {this.state.errorMessage}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
