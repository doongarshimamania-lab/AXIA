import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Proper error boundary component that catches errors gracefully.
 * Replaces the existing SectionErrorBoundary with an improved version.
 *
 * Features:
 *  - Card with warning icon
 *  - "Something went wrong" title
 *  - Error message display
 *  - "Try Again" button that resets the error boundary
 *  - Optional custom fallback
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback to render instead of the default error card */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorKey: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(
      "[ErrorBoundary] Caught error:",
      error.message,
      info.componentStack?.split("\n").slice(0, 3).join("\n")
    );
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, error: null, errorKey: prev.errorKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error fallback UI
      return (
        <Card className="border-destructive/25">
          <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>

            <h3 className="text-h3 text-foreground mb-2">
              Something went wrong
            </h3>

            {this.state.error && (
              <p className="text-body-sm text-muted-foreground max-w-[400px] mb-4">
                {this.state.error.message}
              </p>
            )}

            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div key={this.state.errorKey}>
        {this.props.children}
      </div>
    );
  }
}
