import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ChevronLeft, Activity, Users, Briefcase, TrendingUp, Zap, FileText, Home, Shield, Link as LinkIcon, Settings, HelpCircle, Loader2, CheckCircle2, ChevronDown, Clock, Database, FileSignature, Kanban } from "lucide-react";
import { ProfileSection } from "@/components/ProfileSection";

type Platform = "upwork" | "fiverr" | "toptal" | "freelancer";

const platformLabels: Record<Platform, string> = {
  upwork: "Upwork",
  fiverr: "Fiverr",
  toptal: "Toptal",
  freelancer: "Freelancer.com",
};

const platformColors: Record<Platform, string> = {
  upwork: "#14A800",
  fiverr: "#1DBF73",
  toptal: "#204ECF",
  freelancer: "#29B2FE",
};

export function CollapsibleSidebar() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("axia_sidebar_state") !== "collapsed";
    }
    return true;
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("axia_sidebar_sections");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Mock data replacing Convex queries
  const profile = { name: "Freelancer User", subscriptionTier: "pro" as const }; // Mock profile
  const protectionMetrics = { 
    protectionScore: 92, 
    activeSession: { startTime: Date.now() - 30 * 60000 }, // 30 min session
    protectedHours: 4.5,
    evidenceEvents: 12,
    connectedPlatforms: 2
  }; // Mock metrics
  const evidenceStats = { total: 45, recent: 3 }; // Mock evidence
  const recentReports = [ // Mock reports
    { _id: "1", caseId: "UPW-2024-001", status: "generated" as const, generatedAt: Date.now() - 86400000 },
    { _id: "2", caseId: "FIV-2024-002", status: "sent" as const, generatedAt: Date.now() - 2 * 86400000 }
  ];
  const monthlyUsage = { used: 2, limit: 10 }; // Mock usage
  const platformStatus = { upwork: "connected", fiverr: "disconnected" }; // Mock status
  const currentSession = { _id: "session-123" }; // Mock session

  // Mock connections and mutations as local state/actions
  const [connections, setConnections] = useState([
    { platform: "upwork" as Platform, status: "connected" as const, lastSyncedAt: Date.now() - 3600000 },
    { platform: "fiverr" as Platform, status: "disconnected" as const }
  ]); // Mock connections
  const generateUniversalReport = async ({ sessionId }: { sessionId: string }) => {
    toast.success("Report generated successfully!"); // Mock mutation
  };
  const initiate = async ({ platform }: { platform: Platform }) => ({ 
    alreadyConnected: false, 
    connectionId: "mock-conn-123" 
  }); // Mock initiate
  const complete = async (args: any) => { /* Mock complete */ }; // No-op
  const disconnect = async ({ platform }: { platform: Platform }) => ({ 
    deletedRecords: 5 
  }); // Mock disconnect, update local state
  const handleDisconnect = async () => {
    if (!selectedPlatform) return;
    setIsDisconnecting(true);
    // Simulate disconnect
    setConnections(prev => prev.filter(c => c.platform !== selectedPlatform));
    toast.success(`Disconnected from ${platformLabels[selectedPlatform]}`, { description: "Deleted 5 records" });
    setShowDisconnectDialog(false);
    setSelectedPlatform(null);
    setIsDisconnecting(false);
  };

  // Save scroll position on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("axia_sidebar_scroll", container.scrollTop.toString());
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (typeof localStorage !== "undefined") {
      const savedScroll = localStorage.getItem("axia_sidebar_scroll");
      if (savedScroll) {
        container.scrollTop = parseInt(savedScroll, 10);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axia_sidebar_state", isExpanded ? "expanded" : "collapsed");
      // Sync CSS variable immediately when state changes
      document.documentElement.style.setProperty('--sidebar-width', isExpanded ? '320px' : '80px');
    }
  }, [isExpanded]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axia_sidebar_sections", JSON.stringify(expandedSections));
    }
  }, [expandedSections]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev: Record<string, boolean>) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const username = profile?.name || "User";
  const userInitial = username.charAt(0).toUpperCase();
  const subscriptionTier = profile?.subscriptionTier || "free";
  const protectionScore = protectionMetrics?.protectionScore || 100;

  // Calculate active session duration
  const activeSessionDuration = protectionMetrics?.activeSession 
    ? Math.floor((Date.now() - protectionMetrics.activeSession.startTime) / 60000)
    : 0;

  return (
    <>
      <motion.div
        className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 overflow-hidden pointer-events-auto"
        initial={false}
        animate={{ width: isExpanded ? 320 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ 
          cursor: isExpanded ? 'default' : 'pointer',
          zIndex: 9999
        }}
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
          }
        }}
        onAnimationStart={() => {
          document.documentElement.style.setProperty('--sidebar-width', isExpanded ? '320px' : '80px');
        }}
        onAnimationComplete={() => {
          document.documentElement.style.setProperty('--sidebar-width', isExpanded ? '320px' : '80px');
        }}
      >
        {/* Logo Section */}
        <div
          className="h-16 border-b border-sidebar-border flex items-center justify-between px-5 relative hover:bg-sidebar-accent transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (isExpanded) {
              setIsExpanded(false);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ zIndex: 10000 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 6V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V6L12 2Z" fill="#8B5CF6"/>
                <path d="M12 8V12L15 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-[Space_Grotesk] font-semibold text-lg text-sidebar-foreground whitespace-nowrap overflow-hidden"
                >
                  Axia
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="w-6 h-6 flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Profile Section - Using imported component */}
        <ProfileSection 
          profile={profile} 
          isExpanded={isExpanded} 
          onOpenProfile={() => {
            const event = new CustomEvent('openProfileModal');
            window.dispatchEvent(event);
          }} 
        />

        {/* Navigation Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', pointerEvents: 'auto' }}
        >
          <style>{`
            div::-webkit-scrollbar { width: 4px; }
            div::-webkit-scrollbar-track { background: transparent; }
            div::-webkit-scrollbar-thumb { background: oklch(0.4 0.02 240); border-radius: 2px; }
            div::-webkit-scrollbar-thumb:hover { background: oklch(0.5 0.02 240); }
          `}</style>
          <AnimatePresence>
            {isExpanded ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="py-2 space-y-2"
                style={{ pointerEvents: 'auto' }}
              >
                {/* WORK Section */}
                <div className="px-2 space-y-0.5">
                  <div className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1 font-semibold">
                    WORK
                  </div>
                  <button 
                    onClick={() => navigate("/dashboard")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={Home} label="Dashboard" isExpanded={true} />
                  </button>
                  <button 
                    onClick={() => navigate("/projects")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={Briefcase} label="Projects" isExpanded={true} />
                  </button>
                  <button 
                    onClick={() => navigate("/clients")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={Users} label="Clients" isExpanded={true} />
                  </button>
                  <button 
                    onClick={() => navigate("/evidence-library")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={Database} label="Evidence Library" isExpanded={true} />
                  </button>
                  <button 
                    onClick={() => navigate("/time-tracking")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={Clock} label="Time Tracking" isExpanded={true} />
                  </button>
                  <button 
                    onClick={() => navigate("/tags")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={Settings} label="Tags" isExpanded={true} />
                  </button>
                  <button 
                    onClick={() => navigate("/goals")} 
                    className="w-full text-left"
                  >
                    <NavItem icon={TrendingUp} label="Goals" isExpanded={true} />
                  </button>
                </div>

                {/* CRM Section */}
                <div className="px-2 space-y-0.5 mt-4">
                  <div className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1 font-semibold">
                    CRM
                  </div>
                  <button onClick={() => navigate("/pipeline")} className="w-full text-left" type="button">
                    <NavItem icon={Kanban} label="Pipeline" isExpanded={true} />
                  </button>
                  <button onClick={() => navigate("/proposals")} className="w-full text-left" type="button">
                    <NavItem icon={FileSignature} label="Proposals" isExpanded={true} />
                  </button>
                </div>

                {/* BILLING Section */}
                <div className="px-2 space-y-0.5 mt-4">
                  <div className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1 font-semibold">
                    BILLING
                  </div>
                  <button onClick={() => navigate("/invoices")} className="w-full text-left" type="button">
                    <NavItem icon={FileText} label="Invoices" isExpanded={true} />
                  </button>
                  <button onClick={() => navigate("/payment-patterns")} className="w-full text-left" type="button">
                    <NavItem icon={TrendingUp} label="Payment Patterns" isExpanded={true} />
                  </button>
                  <button onClick={() => navigate("/reports")} className="w-full text-left" type="button">
                    <NavItem icon={Activity} label="Reports" isExpanded={true} />
                  </button>
                </div>

                {/* INTEGRATIONS Section */}
                <div className="px-2 space-y-0.5 mt-4">
                  <div className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1 font-semibold">
                    INTEGRATIONS
                  </div>
                  <button onClick={() => navigate("/platform-integrations")} className="w-full text-left" type="button">
                    <NavItem icon={LinkIcon} label="Platform Connections" isExpanded={true} />
                  </button>
                  <button onClick={() => navigate("/evidence-export")} className="w-full text-left" type="button">
                    <NavItem icon={FileText} label="Evidence Export" isExpanded={true} />
                  </button>

                </div>

                {/* ADMIN Section */}
                <div className="px-2 space-y-0.5 mt-4">
                  <div className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1 font-semibold">
                    ADMIN
                  </div>
                  <button onClick={() => navigate("/subscription")} className="w-full text-left" type="button">
                    <NavItem icon={Zap} label="Subscription" isExpanded={true} />
                  </button>
                  <button onClick={() => {
                    const event = new CustomEvent('openProfileModal');
                    window.dispatchEvent(event);
                  }} className="w-full text-left" type="button">
                    <NavItem icon={Settings} label="Account Settings" isExpanded={true} />
                  </button>
                  <button onClick={() => navigate("/help-center")} className="w-full text-left" type="button">
                    <NavItem icon={HelpCircle} label="Help Center" isExpanded={true} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="py-6 flex flex-col items-center gap-6"
              >
                <button onClick={() => navigate("/dashboard")} title="Dashboard" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Home className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/projects")} title="Projects" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Briefcase className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/clients")} title="Clients" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Users className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/evidence-library")} title="Evidence Library" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Database className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/reports")} title="Reports" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Activity className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/pipeline")} title="Pipeline" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Kanban className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/proposals")} title="Proposals" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <FileSignature className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/platform-integrations")} title="Platform Connections" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <LinkIcon className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
                <button onClick={() => navigate("/subscription")} title="Subscription" className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
                  <Zap className="w-6 h-6 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Section - Theme Toggle + Work Timeline */}
        <div className="border-t border-sidebar-border py-2">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-0.5 px-2 text-xs"
              >
                {/* Theme Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTheme();
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Moon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="font-medium text-[13px] whitespace-nowrap overflow-hidden">
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  </div>
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  const event = new CustomEvent('openTimelinePopup');
                  window.dispatchEvent(event);
                }} className="w-full text-left">
                  <NavItem icon={Activity} label="Work Timeline" isExpanded={true} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Collapsed theme toggle icon */}
          {!isExpanded && (
            <div className="flex flex-col items-center gap-4 py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-sidebar-foreground/60 hover:text-sidebar-foreground" />
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isExpanded: boolean;
}

function NavItem({ icon: Icon, label, isActive, isExpanded }: NavItemProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
        isActive
          ? "bg-primary/20 text-primary"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
      {isExpanded && (
        <span className="font-medium text-[13px] whitespace-nowrap overflow-hidden">
          {label}
        </span>
      )}
    </div>
  );
}

interface ExpandableSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export function ExpandableSection({ title, isExpanded, onToggle, children }: ExpandableSectionProps) {
  return (
    <div className="border-b border-sidebar-border/50 pb-2 mb-2">
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
      >
        <span className="font-medium text-[12px]">{title}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}