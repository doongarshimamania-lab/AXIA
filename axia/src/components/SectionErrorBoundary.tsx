import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  /** A human-readable name for the section, shown in the error fallback */
  name?: string;
  /** Optional className for the fallback card */
  className?: string;
}

interface State {
  hasError: boolean;
  errorKey: number;
}

/**
 * Per-section error boundary that prevents one failing section from crashing
 * the entire page. Shows a minimal fallback with a "Retry" button.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(
      `[SectionErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`,
      error.message,
      info.componentStack?.split("\n").slice(0, 3).join("\n")
    );
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, errorKey: prev.errorKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className={`p-6 ${this.props.className ?? ""}`}>
          <div className="text-center py-4">
            <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              {this.props.name
                ? `Failed to load ${this.props.name}`
                : "Something went wrong loading this section."}
            </p>
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              Retry
            </Button>
          </div>
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
