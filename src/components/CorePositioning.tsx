import { Card } from "@/components/ui/card";

interface CorePositioningProps {
  tierData: {
    protectionValue: number;
    timePeriod: string;
    platform: string;
    statusColor: string;
    protectionStatus: string;
  };
}

export function CorePositioning({ tierData }: CorePositioningProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20">
      <div className="space-y-4">
        <h3 className="text-2xl font-black text-foreground">Your Work Is Payment-Protected</h3>
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">${tierData.protectionValue}</span> protected this {tierData.timePeriod} by ensuring 
          your evidence meets {tierData.platform} requirements for payment approval
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div 
              className="h-3 w-3 rounded-full animate-pulse" 
              style={{ backgroundColor: tierData.statusColor }}
            />
            <span className="text-sm font-semibold text-foreground">{tierData.protectionStatus}</span>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-black text-primary">${tierData.protectionValue}</div>
            <div className="text-xs text-muted-foreground">protected</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
