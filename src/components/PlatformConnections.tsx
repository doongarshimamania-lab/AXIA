import { Button } from "@/components/ui/button";
import { ExpandableSection } from "./CollapsibleSidebar"; // Assuming shared

type Platform = "upwork" | "fiverr" | "toptal" | "freelancer";

interface PlatformConnectionsProps {
  platforms: Platform[];
  connections: any[];
  platformLabels: Record<Platform, string>;
  platformColors: Record<Platform, string>;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  selectedPlatform: Platform | null;
  onConnectClick: (platform: Platform) => void;
  onDisconnectClick: (platform: Platform) => void;
  getConnectionStatus: (platform: Platform) => any;
}

export function PlatformConnections({ 
  platforms, 
  connections, 
  platformLabels, 
  platformColors, 
  expandedSections, 
  onToggleSection, 
  selectedPlatform, 
  onConnectClick, 
  onDisconnectClick, 
  getConnectionStatus 
}: PlatformConnectionsProps) {
  return (
    <ExpandableSection
      title="Platform Connections"
      isExpanded={expandedSections.platforms}
      onToggle={() => onToggleSection("platforms")}
    >
      <div className="space-y-1 pt-1 px-2">
        {platforms.map((platform) => {
          const connection = getConnectionStatus(platform);
          const isConnected = !!connection;
          
          return (
            <div
              key={platform}
              className="flex items-center justify-between p-1.5 rounded bg-platinum-800 border border-border-muted"
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: platformColors[platform] }}
                >
                  {platformLabels[platform][0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[11px] font-medium truncate">
                    {platformLabels[platform]}
                  </div>
                  {isConnected && connection.lastSyncedAt && (
                    <div className="text-[8px] text-muted-foreground mt-0.5">
                      Last synced: {new Date(connection.lastSyncedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {isConnected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-[8px] text-white/60 hover:text-white hover:bg-border-muted"
                    onClick={() => onDisconnectClick(platform)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-5 px-1 text-[8px] bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => onConnectClick(platform)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ExpandableSection>
  );
}
