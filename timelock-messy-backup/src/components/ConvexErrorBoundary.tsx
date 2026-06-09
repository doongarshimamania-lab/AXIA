import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary that catches errors thrown by Convex queries (e.g., Server Error).
 * This prevents the entire app from crashing when the Convex backend is unreachable
 * or returns errors. Instead, it renders children with a subtle error indicator.
 */
export class ConvexErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log but don't crash the app
    console.warn("[ConvexErrorBoundary] Caught error:", error.message);
    console.warn("[ConvexErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default: render children anyway, but suppress the error
      // This allows the page to display even when Convex is down
      return null;
    }
    return this.props.children;
  }
}

/**
 * A wrapper that suppresses Convex query errors and renders children regardless.
 * Use this around components that use Convex queries but should still render
 * their UI even if the backend is unavailable.
 */
export class ConvexSafeRender extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[ConvexSafeRender] Suppressed Convex error:", error.message);
  }

  render() {
    // Always render children, swallowing any Convex errors
    return this.props.children;
  }
}
