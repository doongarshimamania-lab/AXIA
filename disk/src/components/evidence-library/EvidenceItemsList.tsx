import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, FileText, ChevronLeft, ChevronRight, Mouse, Keyboard, Globe } from "lucide-react";

type ViewType = "date" | "project" | "client" | "type";

interface EvidenceItem {
  id: string;
  type: "screenshot_ref" | "memo" | "url" | "mouse" | "keyboard" | "platform_status";
  timestamp: number;
  platform: string;
  description: string;
  metadata?: any;
}

interface EvidenceItemsListProps {
  evidenceItems: EvidenceItem[];
  viewMode: ViewType;
  setViewMode: (mode: ViewType) => void;
}

function formatDateHeader(timestamp: number | undefined): string {
  if (!timestamp) return "No date";
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function EvidenceItemsList({ evidenceItems, viewMode, setViewMode }: EvidenceItemsListProps) {
  return (
    <div className="flex gap-6">
      {/* Filter Sidebar */}
      <Card className="w-64 p-4 bg-[#1E293B] border-[#334155] h-fit">
        <h3 className="font-bold text-white mb-3">Filter Evidence</h3>
        <div className="space-y-1">
          <Button 
            variant={viewMode === "date" ? "default" : "ghost"} 
            className={`w-full justify-start ${viewMode === "date" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            onClick={() => setViewMode("date")}
          >
            Date-Wise (Default)
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setViewMode("project")}
          >
            Project-Wise
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setViewMode("client")}
          >
            Client-Wise
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setViewMode("type")}
          >
            Evidence Type
          </Button>
        </div>
      </Card>

      {/* Evidence List */}
      <Card className="flex-1 p-6 bg-[#1E293B] border-[#334155]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-2xl text-white">Evidence Library</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Nov 2025</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {evidenceItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mb-4" />
              <h4 className="text-white font-semibold mb-1">No evidence items</h4>
              <p className="text-sm text-slate-400">Evidence will appear here as you track work sessions and capture screenshots.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">
                  {formatDateHeader(evidenceItems[0]?.timestamp)}
                </h4>
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {evidenceItems.length} item{evidenceItems.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {evidenceItems.map((item) => (
                  <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
                    <div className="w-full h-24 bg-slate-900 rounded flex items-center justify-center">
                      {item.type === "screenshot_ref" ? (
                        <Camera className="w-8 h-8 text-slate-600" />
                      ) : item.type === "memo" ? (
                        <FileText className="w-8 h-8 text-slate-400" />
                      ) : item.type === "url" ? (
                        <Globe className="w-8 h-8 text-slate-400" />
                      ) : item.type === "mouse" ? (
                        <Mouse className="w-8 h-8 text-slate-400" />
                      ) : item.type === "keyboard" ? (
                        <Keyboard className="w-8 h-8 text-slate-400" />
                      ) : (
                        <FileText className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <Badge className={`${item.type === "screenshot_ref" ? "bg-blue-600" : item.type === "memo" ? "bg-amber-500" : "bg-emerald-600"} text-white text-xs`}>
                      {item.type === "screenshot_ref" ? "Screenshot" : item.type === "memo" ? "Memo" : item.type === "url" ? "URL" : item.type === "mouse" ? "Mouse" : item.type === "keyboard" ? "Keyboard" : "Status"}
                    </Badge>
                    <div className="text-sm font-semibold text-white">
                      {formatTime(item.timestamp)}
                    </div>
                    {item.platform && (
                      <div className="text-xs text-blue-400">{item.platform}</div>
                    )}
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}