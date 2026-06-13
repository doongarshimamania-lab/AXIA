import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";
import { initMonitoring, captureException } from "@/lib/monitoring";

type SyncError = {
  error: string;
  stack: string;
  filename: string;
  lineno: number;
  colno: number;
};

type AsyncError = {
  error: string;
  stack: string;
};

type GenericError = SyncError | AsyncError;

async function reportErrorToVly(errorData: {
  error: string;
  stackTrace?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}) {
  if (!import.meta.env.VITE_VLY_APP_ID) {
    return;
  }

  try {
    await fetch(import.meta.env.VITE_VLY_MONITORING_URL, {
      method: "POST",
      body: JSON.stringify({
        ...errorData,
        url: window.location.href,
        projectSemanticIdentifier: import.meta.env.VITE_VLY_APP_ID,
      }),
    });
  } catch (error) {
    console.error("Failed to report error to Vly:", error);
  }
}

function ErrorDialog({
  error,
  setError,
}: {
  error: GenericError;
  setError: (error: GenericError | null) => void;
}) {
  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={() => {
        setError(null);
      }}
    >
      <DialogContent className="bg-red-700 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle>Runtime Error</DialogTitle>
        </DialogHeader>
        A runtime error occurred. Open the vly editor to automatically debug the
        error.
        <div className="mt-4">
          <Collapsible>
            <CollapsibleTrigger>
              <div className="flex items-center font-bold cursor-pointer">
                See error details <ChevronDown />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="max-w-[460px]">
              <div className="mt-2 p-3 bg-neutral-800 rounded text-white text-sm overflow-x-auto max-h-60 max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <pre className="whitespace-pre">{error.stack}</pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter>
          <a
            href={`https://vly.ai/project/${import.meta.env.VITE_VLY_APP_ID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>
              <ExternalLink /> Open editor
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ErrorBoundaryState = {
  hasError: boolean;
  error: GenericError | null;
};

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
  },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to both Vly and Sentry
    reportErrorToVly({
      error: error.message,
      stackTrace: error.stack,
    });

    captureException(error, {
      componentStack: info.componentStack,
    });

    this.setState({
      hasError: true,
      error: {
        error: error.message,
        stack: info.componentStack ?? error.stack ?? "",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDialog
          error={{
            error: "An error occurred",
            stack: "",
          }}
          setError={() => {}}
        />
      );
    }

    return this.props.children;
  }
}

export function InstrumentationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [error, setError] = useState<GenericError | null>(null);

  // Initialize Sentry + PostHog on mount
  useEffect(() => {
    initMonitoring();
  }, []);

  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      try {
        console.error("Runtime error:", event.message, event.filename, event.lineno);

        // Report all errors to Sentry (it handles filtering internally)
        captureException(new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });

        // Skip showing error dialog for certain non-critical errors
        const skipErrors = [
          "ResizeObserver",
          "Network request failed",
          "Failed to fetch",
          "chunk",
          "Convex",
          "convex",
          "WebSocket",
          "Cannot read properties",
          "user is not authenticated",
          "Not authenticated",
        ];

        const shouldSkip = skipErrors.some(err =>
          event.message?.includes(err) || event.filename?.includes(err)
        );

        if (shouldSkip) {
          console.warn("Skipped showing error dialog for:", event.message);
          return;
        }

        event.preventDefault();
        setError({
          error: event.message,
          stack: event.error?.stack || "",
          filename: event.filename || "",
          lineno: event.lineno,
          colno: event.colno,
        });

        if (import.meta.env.VITE_VLY_APP_ID) {
          await reportErrorToVly({
            error: event.message,
            stackTrace: event.error?.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          });
        }
      } catch (error) {
        console.error("Error in handleError:", error);
      }
    };

    const handleRejection = async (event: PromiseRejectionEvent) => {
      try {
        const errorMessage = event.reason?.message || String(event.reason) || "Unknown error";
        console.error("Unhandled promise rejection:", errorMessage);

        // Report to Sentry
        captureException(event.reason instanceof Error ? event.reason : new Error(errorMessage), {
          type: "unhandled_rejection",
        });

        const skipErrors = [
          "ResizeObserver",
          "Network request failed",
          "Failed to fetch",
          "chunk",
          "NetworkError",
          "timeout",
          "Convex",
          "convex",
          "WebSocket",
          "Cannot read properties",
          "user is not authenticated",
          "Not authenticated",
        ];

        const shouldSkip = skipErrors.some(err =>
          errorMessage?.includes(err)
        );

        if (shouldSkip) {
          console.warn("Skipped showing error dialog for rejection:", errorMessage);
          return;
        }

        const errorStack = event.reason?.stack || "";

        if (import.meta.env.VITE_VLY_APP_ID) {
          await reportErrorToVly({
            error: errorMessage,
            stackTrace: errorStack,
          });
        }

        setError({
          error: errorMessage,
          stack: errorStack,
        });
      } catch (error) {
        console.error("Error in handleRejection:", error);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return (
    <>
      <ErrorBoundary>{children}</ErrorBoundary>
      {error && <ErrorDialog error={error} setError={setError} />}
    </>
  );
}

export function trackConversion(eventName: string, payload: any) {
  console.log(`[Axia Conversion] ${eventName}:`, payload);
  // Now integrated with PostHog via monitoring.ts
  import("@/lib/monitoring").then(({ trackEvent }) => {
    trackEvent(eventName, payload);
  });
}
