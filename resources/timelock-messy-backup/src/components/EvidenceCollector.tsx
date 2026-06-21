import { useEffect, useRef, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { trackConversion } from "@/instrumentation";

interface EvidenceCollectorProps {
  sessionId: Id<"workSessions"> | null;
  platform: "upwork" | "fiverr" | "toptal" | "freelancer" | "client";
  isActive: boolean;
}

export function useEvidenceCollector({ sessionId, platform, isActive }: EvidenceCollectorProps) {
  const [evidenceSessionId, setEvidenceSessionId] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);
  
  const eventBuffer = useRef<any[]>([]);
  const lastFlush = useRef(Date.now());
  const flushInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Start session via HTTP
  const startEvidenceSessionHttp = async (params: { sessionId: Id<"workSessions">; platform: EvidenceCollectorProps["platform"] }) => {
    const res = await fetch("/api/extension/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "dev-token",
        sessionId: params.sessionId,
        platform: params.platform,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to start evidence session");
    }
    const data = await res.json();
    return data.evidenceSessionId as string;
  };

  // Record events via HTTP
  const recordEventsHttp = async (evidenceSessionId: string, events: any[]) => {
    if (!events.length) return;
    const res = await fetch("/api/extension/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "dev-token",
        evidenceSessionId,
        events,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to record events");
    }
    return await res.json();
  };

  // Finalize session via HTTP
  const finalizeEvidenceSessionHttp = async (evidenceSessionId: string) => {
    const res = await fetch("/api/extension/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "dev-token",
        evidenceSessionId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to finalize evidence session");
    }
    return await res.json();
  };

  // Throttled event handlers
  const handleMouseMove = useRef(
    throttle(() => {
      if (!isCollecting || !evidenceSessionId) return;
      addEvent({
        t: Date.now(),
        kind: "mouse",
        data: { type: "mousemove" },
      });
    }, 250) // 4 Hz max
  ).current;

  const handleKeyDown = useRef(
    debounce((e: KeyboardEvent) => {
      if (!isCollecting || !evidenceSessionId) return;
      addEvent({
        t: Date.now(),
        kind: "keyboard",
        data: { key: e.key, code: e.code },
      });
    }, 100)
  ).current;

  const handleVisibilityChange = () => {
    if (!isCollecting || !evidenceSessionId) return;
    addEvent({
      t: Date.now(),
      kind: "platform_status",
      data: { 
        visibility: document.visibilityState,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: new Date().getTimezoneOffset(),
        screenResolution: `${screen.width}x${screen.height}`,
      },
    });
  };

  const handleUrlChange = () => {
    if (!isCollecting || !evidenceSessionId) return;
    addEvent({
      t: Date.now(),
      kind: "url",
      data: { url: window.location.href },
      url: window.location.href,
    });
  };

  const addEvent = (event: any) => {
    eventBuffer.current.push(event);
    setEventCount(prev => prev + 1);
    
    // Auto-flush if buffer gets large
    if (eventBuffer.current.length >= 100) {
      flushEvents();
    }
  };

  const flushEvents = async () => {
    if (!evidenceSessionId || eventBuffer.current.length === 0) return;
    
    const events = [...eventBuffer.current];
    eventBuffer.current = [];
    
    try {
      await recordEventsHttp(evidenceSessionId, events);
      lastFlush.current = Date.now();
    } catch (error) {
      console.error("Failed to flush events:", error);
      toast.error("Evidence collection interrupted", {
        description: "Some evidence may not have been recorded",
      });
    }
  };

  // Start evidence collection
  useEffect(() => {
    if (!sessionId || !isActive || isCollecting) return;

    const startCollection = async () => {
      try {
        const id = await startEvidenceSessionHttp({ sessionId, platform });
        setEvidenceSessionId(id);
        setIsCollecting(true);
        
        // Add initial fingerprint event
        addEvent({
          t: Date.now(),
          kind: "platform_status",
          data: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: new Date().getTimezoneOffset(),
            screenResolution: `${screen.width}x${screen.height}`,
            sessionStart: true,
          },
        });

        trackConversion("evidence_started", { platform, sessionId });
        
        // Set up flush interval
        flushInterval.current = setInterval(flushEvents, 5000);

        // Optional: lightweight screenshot_ref stubs every ~10 minutes (no image upload yet)
        // This seeds timeline markers for future screenshot pipeline without new deps.
        // We align to platform typical intervals but avoid storage for now.
        addEvent({
          t: Date.now(),
          kind: "screenshot_ref",
          data: {
            placeholder: true,
            note: "scheduled marker",
            intervalMs: 10 * 60 * 1000,
          },
        });
        
      } catch (error) {
        console.error("Failed to start evidence collection:", error);
        toast.error("Could not start evidence collection");
      }
    };

    startCollection();
  }, [sessionId, isActive, platform]);

  // Stop evidence collection
  useEffect(() => {
    if (!isCollecting || isActive) return;

    const stopCollection = async () => {
      if (flushInterval.current) {
        clearInterval(flushInterval.current);
        flushInterval.current = null;
      }
      
      // Final flush
      await flushEvents();
      
      if (evidenceSessionId) {
        try {
          await finalizeEvidenceSessionHttp(evidenceSessionId);
          trackConversion("evidence_finalized", { 
            platform, 
            sessionId, 
            eventCount 
          });
        } catch (error) {
          console.error("Failed to finalize evidence session:", error);
        }
      }
      
      setIsCollecting(false);
      setEvidenceSessionId(null);
      setEventCount(0);
    };

    stopCollection();
  }, [isActive, isCollecting]);

  // Set up event listeners
  useEffect(() => {
    if (!isCollecting) return;

    // Only collect when document is visible
    if (document.visibilityState !== 'visible') return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [isCollecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushInterval.current) {
        clearInterval(flushInterval.current);
      }
    };
  }, []);

  return {
    isCollecting,
    eventCount,
    evidenceSessionId,
  };
}

// Utility functions
function throttle(func: Function, limit: number) {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}