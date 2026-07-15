import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, FileText, ChevronLeft, ChevronRight } from "lucide-react";

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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold">Invalid Date</h4>
            <Badge variant="outline" className="text-blue-400 border-blue-400">3 items</Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
              <div className="w-full h-24 bg-slate-900 rounded flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-600" />
              </div>
              <Badge className="bg-blue-600 text-white text-xs">Screenshot</Badge>
              <div className="text-sm font-semibold text-white">9:58 PM</div>
              <div className="text-xs text-blue-400">Upwork</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center h-24">
                <div className="text-center">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Client requested design changes for the login page...</p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-white text-xs">Memo</Badge>
              <div className="text-sm font-semibold text-white">10:58 PM</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
              <div className="w-full h-24 bg-slate-900 rounded flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-600" />
              </div>
              <Badge className="bg-blue-600 text-white text-xs">Screenshot</Badge>
              <div className="text-sm font-semibold text-white">11:28 PM</div>
              <div className="text-xs text-blue-400">Toptal</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}