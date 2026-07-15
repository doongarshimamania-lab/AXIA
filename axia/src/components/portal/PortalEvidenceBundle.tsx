// ──────────────────────────────────────────────────────────────────────────────
// components/portal/PortalEvidenceBundle.tsx — Evidence bundle viewer.
//
// P1-b: Clients can view the verified-work bundle for a deliverable.
//
// Renders:
//   - Summary card (total events, time tracked, session count)
//   - Event counts by type (mouse / keyboard / url / screenshot / memo)
//   - Screenshot gallery (click to enlarge)
//   - Timeline list (newest first, scrollable)
//
// ponytail: reuses portal.evidence.getEvidenceBundle. No client-side trust —
// all data comes from the JWT-scoped backend.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MousePointer,
  Keyboard,
  Globe,
  Camera,
  StickyNote,
  Activity,
  Clock,
  ArrowLeft,
  Download,
  X,
} from "lucide-react";

interface PortalEvidenceBundleProps {
  token: string;
  deliverableId: string;
  deliverableName: string;
  onBack: () => void;
}

export function PortalEvidenceBundle({
  token,
  deliverableId,
  deliverableName,
  onBack,
}: PortalEvidenceBundleProps) {
  const bundle = useQuery(api.portal.evidence.getEvidenceBundle, {
    token,
    deliverableId,
  });
  const [enlargedScreenshot, setEnlargedScreenshot] = useState<string | null>(null);

  if (bundle === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (bundle === null) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-slate-500">No evidence bundle available for this deliverable.</p>
          <Button variant="outline" className="mt-3" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to deliverable
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">Evidence Bundle</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verified work record for <span className="font-medium">{deliverableName}</span>
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Activity className="h-4 w-4 text-violet-500" />}
          label="Total events"
          value={bundle.summary.totalEvents.toLocaleString()}
        />
        <SummaryCard
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          label="Time tracked"
          value={`${bundle.summary.totalTimeHours}h`}
        />
        <SummaryCard
          icon={<Camera className="h-4 w-4 text-emerald-500" />}
          label="Screenshots"
          value={bundle.summary.eventCounts.screenshot.toString()}
        />
        <SummaryCard
          icon={<Globe className="h-4 w-4 text-amber-500" />}
          label="Sessions"
          value={bundle.summary.sessionsIncluded.toString()}
        />
      </div>

      {/* Event type breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <EventCount icon={<MousePointer className="h-3.5 w-3.5" />} label="Mouse" count={bundle.summary.eventCounts.mouse} />
            <EventCount icon={<Keyboard className="h-3.5 w-3.5" />} label="Keys" count={bundle.summary.eventCounts.keyboard} />
            <EventCount icon={<Globe className="h-3.5 w-3.5" />} label="URLs" count={bundle.summary.eventCounts.url} />
            <EventCount icon={<Camera className="h-3.5 w-3.5" />} label="Shots" count={bundle.summary.eventCounts.screenshot} />
            <EventCount icon={<StickyNote className="h-3.5 w-3.5" />} label="Memos" count={bundle.summary.eventCounts.memo} />
            <EventCount icon={<Activity className="h-3.5 w-3.5" />} label="Other" count={bundle.summary.eventCounts.platform_status} />
          </div>
        </CardContent>
      </Card>

      {/* Screenshots */}
      {bundle.screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Screenshots ({bundle.screenshots.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {bundle.screenshots.map((s: any) => (
                <button
                  key={s.eventId}
                  onClick={() => setEnlargedScreenshot(s.url)}
                  className="aspect-video rounded-md overflow-hidden border border-slate-200 hover:border-violet-300 transition-colors"
                >
                  <img
                    src={s.url}
                    alt={`Screenshot ${new Date(s.timestamp).toLocaleString()}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {bundle.timeline.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No timeline events recorded.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {bundle.timeline.slice().reverse().map((event: any) => (
                <TimelineRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enlarged screenshot modal */}
      {enlargedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setEnlargedScreenshot(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          <img
            src={enlargedScreenshot}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={enlargedScreenshot}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4" /> Download
          </a>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-slate-500">{label}</span>
        </div>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function EventCount({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-slate-50">
      <div className="text-slate-500">{icon}</div>
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{count.toLocaleString()}</span>
    </div>
  );
}

function TimelineRow({ event }: { event: any }) {
  const icon = getEventIcon(event.type);
  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{event.description}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
          <span>{new Date(event.timestamp).toLocaleString()}</span>
          {event.platform && event.platform !== "unknown" && (
            <>
              <span>·</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">{event.platform}</Badge>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getEventIcon(type: string) {
  switch (type) {
    case "mouse": return <MousePointer className="h-3.5 w-3.5 text-slate-400" />;
    case "keyboard": return <Keyboard className="h-3.5 w-3.5 text-slate-400" />;
    case "url": return <Globe className="h-3.5 w-3.5 text-blue-400" />;
    case "screenshot_ref": return <Camera className="h-3.5 w-3.5 text-emerald-400" />;
    case "memo": return <StickyNote className="h-3.5 w-3.5 text-amber-400" />;
    default: return <Activity className="h-3.5 w-3.5 text-slate-400" />;
  }
}
