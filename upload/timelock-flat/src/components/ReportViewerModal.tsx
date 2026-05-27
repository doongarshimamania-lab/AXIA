import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  reportContent?: string;
};

export function ReportViewerModal({ isOpen, onClose, caseId, reportContent }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent || "");
      toast.success("Report copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = new Blob([reportContent || ""], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${caseId || "timelock_report"}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!w) return;
    const safe = (reportContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`
      <html>
        <head>
          <title>${caseId || "TIMELock Report"}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial; white-space: pre-wrap; padding: 24px; line-height: 1.4; }
            h1,h2,h3 { margin-top: 1rem; }
            code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
            @media (prefers-color-scheme: dark) {
              body { background: #0b1220; color: #e5e7eb; }
              code { background: #111827; }
            }
          </style>
        </head>
        <body>
          <pre>${safe}</pre>
          <script>window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Universal Dispute Report</span>
            {caseId && <span className="text-xs text-muted-foreground">Case ID: {caseId}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="border border-border rounded-md">
          <ScrollArea className="h-[60vh] p-4">
            <pre className="text-sm whitespace-pre-wrap text-foreground">{reportContent || "No content"}</pre>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCopy}>Copy</Button>
          <Button variant="outline" onClick={handlePrint}>Print</Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Downloading..." : "Download .md"}
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
