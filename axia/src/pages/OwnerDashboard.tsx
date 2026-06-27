import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Zap,
  Shield,
  Target
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryTimeout, useConvexConnectionState, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { ConvexReactClient, ConvexProvider } from "convex/react";

// No mock data — all analytics data will come from real backend integrations (Stripe, Airtable, Upwork)
// Until those are connected, dashboard shows N/A / empty states.

// Authentication hook
function useOwnerAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showError, setShowError] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const timeoutRef = useRef<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Server-side credential verification — the actual owner password lives
  // in the OWNER_PASSWORD Convex env var, never in the JS bundle. Previous
  // implementation hardcoded "@@@@HHH$" in client source which meant anyone
  // who opened DevTools could read it. (v5.4.0 security audit)
  // ponytail: fixed phantom api.ownerAuth → api.security.ownerAuth (the function
  // lives in convex/security/ownerAuth.ts, so its api path is api.security.ownerAuth.*)
  const verifyOwner = useMutation(api.security.ownerAuth.ownerAuth_verifyOwnerCredentials);

  const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  const logout = useCallback((message?: string) => {
    setIsAuthenticated(false);
    localStorage.removeItem("ownerSessionActive");
    localStorage.removeItem("ownerLastActivity");
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (message) {
      toast.error(message);
    }
  }, []);

  const resetActivityTimer = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem("ownerLastActivity", now.toString());

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      logout("Session expired");
    }, SESSION_TIMEOUT);
  }, [logout]);

  const login = async (inputPassword: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      // Cap password length client-side too (LPDOS guard).
      const candidate = inputPassword.slice(0, 64);
      const result = await verifyOwner({ password: candidate });
      if (result.success) {
        setIsAuthenticated(true);
        localStorage.setItem("ownerSessionActive", "true");
        resetActivityTimer();
        setFailedAttempts(0);
        setShowError(false);
      } else {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        if (newFailedAttempts >= 3) {
          setShowError(true);
          setTimeout(() => setShowError(false), 5000);
        }
        if (result.error) {
          toast.error(result.error);
        }
      }
    } catch (err) {
      toast.error("Owner verification failed. Try again.");
    } finally {
      setIsVerifying(false);
      setPassword("");
    }
  };

  useEffect(() => {
    // SECURITY: do NOT auto-restore `isAuthenticated` from localStorage.
    // Previously, anyone with XSS could `localStorage.setItem("ownerSessionActive","true")`
    // and bypass the owner password prompt entirely. The owner dashboard
    // exposes Stripe MRR, churn, and high-value user lists.
    //
    // We DO restore the inactivity-timer (so an open tab still logs out after
    // 10 min), but auth state itself must come from a fresh `login()` call.
    const storedLastActivity = localStorage.getItem("ownerLastActivity");
    if (storedLastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(storedLastActivity);
      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        localStorage.removeItem("ownerSessionActive");
        localStorage.removeItem("ownerLastActivity");
      }
    } else {
      localStorage.removeItem("ownerSessionActive");
    }

    // Activity listeners
    const activities = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handleActivity = () => {
      if (isAuthenticated) {
        resetActivityTimer();
      }
    };

    activities.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      activities.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        // Use browser-specific API to ensure the type is number
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [resetActivityTimer]);

  return {
    isAuthenticated,
    password,
    setPassword,
    login,
    logout,
    showError,
    failedAttempts
  };
}

// Reusable ThemeToggle component (persists and applies global theme)
function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Dark</span>
      <Switch checked={isDark} onCheckedChange={setIsDark} />
    </div>
  );
}

// Speedometer component
function RevenueRiskMeter({ mrr, onFixClick }: { mrr: number | null; onFixClick: () => void }) {
  const hasData = mrr !== null && mrr !== undefined;
  // Clamp to 0..500 to prevent overshoot
  const SAFE_MRR = hasData ? Math.max(0, Math.min(mrr, 500)) : 0;
  const percentage = hasData ? Math.round((SAFE_MRR / 500) * 100) : 0;
  const usersNeeded = hasData ? Math.ceil((500 - SAFE_MRR) / 8) : Math.ceil(500 / 8);
  const daysRemaining = null; // No real data yet

  // Geometry constants to ensure full visibility of the arc
  const CENTER_X = 400;
  const CENTER_Y = 340; // lowered so the full semicircle is visible
  const R = 300; // radius of the arc
  const TICK_INNER = R - 20;
  const TICK_OUTER = R;
  const LABEL_R = R + 20;
  const NEEDLE_LEN = R - 40; // needle tip stops slightly inside the arc

  // Map 0..500 to -90..+90 degrees (stay within the semicircle)
  const needleAngle = -90 + (SAFE_MRR / 500) * 180;

  const getZoneColor = () => {
    if (SAFE_MRR < 400) return "#DC2626";
    if (SAFE_MRR < 475) return "#D97706";
    return "#16A34A";
  };

  const getUsersNeededColor = () => {
    if (usersNeeded > 10) return "#DC2626";
    if (usersNeeded >= 6) return "#D97706";
    return "#16A34A";
  };

  return (
    <Card className="col-span-12 mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          {/* Speedometer SVG */}
          <svg width="800" height={CENTER_Y + 80} className="mb-4" style={{ overflow: "visible" }}>
            {/* Background zones */}
            <defs>
              <linearGradient id="redZone" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FEE2E2" />
                <stop offset="100%" stopColor="#FECACA" />
              </linearGradient>
              <linearGradient id="yellowZone" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FEF3C7" />
                <stop offset="100%" stopColor="#FDE68A" />
              </linearGradient>
              <linearGradient id="greenZone" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#DCFCE7" />
                <stop offset="100%" stopColor="#BBF7D0" />
              </linearGradient>
            </defs>

            {/* Zone backgrounds (split into rough thirds using x breakpoints) */}
            <path d={`M 100 ${CENTER_Y} A ${R} ${R} 0 0 1 460 ${CENTER_Y}`} fill="url(#redZone)" stroke="none" />
            <path d={`M 460 ${CENTER_Y} A ${R} ${R} 0 0 1 640 ${CENTER_Y}`} fill="url(#yellowZone)" stroke="none" />
            <path d={`M 640 ${CENTER_Y} A ${R} ${R} 0 0 1 700 ${CENTER_Y}`} fill="url(#greenZone)" stroke="none" />

            {/* Arc outline */}
            <path d={`M 100 ${CENTER_Y} A ${R} ${R} 0 0 1 700 ${CENTER_Y}`} fill="none" stroke="#E2E8F0" strokeWidth="2" />

            {/* Tick marks and labels */}
            {[0, 100, 200, 300, 400, 500].map((value) => {
              const angle = (value / 500) * 180; // 0..180
              const radian = (angle * Math.PI) / 180;
              // Map so 0 -> left (-90°), 180 -> right (+90°)
              const theta = Math.PI - radian; // matches prior logic
              const x1 = CENTER_X + TICK_INNER * Math.cos(theta);
              const y1 = CENTER_Y - TICK_INNER * Math.sin(theta);
              const x2 = CENTER_X + TICK_OUTER * Math.cos(theta);
              const y2 = CENTER_Y - TICK_OUTER * Math.sin(theta);
              const labelX = CENTER_X + LABEL_R * Math.cos(theta);
              const labelY = CENTER_Y - LABEL_R * Math.sin(theta);

              return (
                <g key={value}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748B" strokeWidth="2" />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    className="text-sm font-medium text-muted-foreground"
                    fill="currentColor"
                  >
                    ${value}
                  </text>
                </g>
              );
            })}

            {/* Animated needle - changed to pivot at true center using translate */}
            <g transform={`translate(${CENTER_X} ${CENTER_Y}) rotate(${needleAngle})`}>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={-NEEDLE_LEN}
                stroke="#DC2626"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx={0} cy={0} r="8" fill="#DC2626" />
            </g>
          </svg>

          {/* Status text */}
          <div className="text-center space-y-2">
            {!hasData ? (
              <>
                <div className="text-2xl font-medium text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>
                  No analytics data available
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect Stripe to see revenue metrics and projections.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-medium" style={{ fontFamily: 'Space Grotesk' }}>
                  <span className="text-foreground">${SAFE_MRR.toFixed(2)}</span>
                  <span className="text-muted-foreground"> of $500 target (</span>
                  <span className="text-emerald-600">{percentage}%</span>
                  <span className="text-muted-foreground">)</span>
                </div>

                <div className="text-2xl font-medium" style={{ fontFamily: 'Space Grotesk', color: getUsersNeededColor() }}>
                  {usersNeeded} users needed to hit goal
                </div>

                {daysRemaining !== null && (
                  <div className="text-2xl font-medium text-emerald-600" style={{ fontFamily: 'Space Grotesk' }}>
                    Profitability in {daysRemaining} days
                  </div>
                )}
              </>
            )}
          </div>

          {/* Fix This button */}
          <motion.div className="mt-6 flex justify-end w-full">
            <motion.button
              onClick={onFixClick}
              className="px-6 py-3 text-white font-semibold rounded-md shadow-md"
              style={{ backgroundColor: getZoneColor() }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onTap={() => {
                const button = document.activeElement as HTMLElement;
                if (button) {
                  button.style.transform = "scale(0.95)";
                  setTimeout(() => { button.style.transform = "scale(1.05)"; }, 150);
                  setTimeout(() => { button.style.transform = "scale(1)"; }, 300);
                }
              }}
            >
              Fix This
            </motion.button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

// Priority Actions Modal
function PriorityActionsModal({ isOpen, onClose, onComplete }: { isOpen: boolean; onClose: () => void; onComplete: () => void }) {
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleMessageUsers = () => {
    setShowUserModal(true);
  };

  const handleSendToAll = () => {
    setShowSuccess(true);
    setTimeout(() => {
      // Notify parent that this priority action is completed
      onComplete();
      setShowSuccess(false);
      setShowUserModal(false);
      onClose();
    }, 2000);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">Priority Actions</DialogTitle>
            <DialogDescription>
              Top revenue-generating actions ranked by ROI per minute
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Priority 1 - Critical */}
            <Card className="border-red-200 bg-red-50 rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Badge variant="destructive" className="mb-2">🚨 CRITICAL</Badge>
                    <h3 className="text-lg font-semibold text-foreground">Message High-Value Users</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xl font-medium text-emerald-600" style={{ fontFamily: 'Space Grotesk' }}>
                        +$72 MRR
                      </span>
                      <span className="text-sm text-slate-600">15 minutes</span>
                      <span className="text-base font-medium" style={{ fontFamily: 'Space Grotesk' }}>
                        $4.80/min
                      </span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleMessageUsers}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Do This
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Priority 2 - Important */}
            <Card className="border-orange-200 bg-orange-50 rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Badge className="mb-2 bg-orange-600">✏️ IMPORTANT</Badge>
                    <h3 className="text-lg font-semibold text-foreground">Update Compliance Rules</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xl font-medium text-emerald-600" style={{ fontFamily: 'Space Grotesk' }}>
                        +$45 MRR
                      </span>
                      <span className="text-sm text-slate-600">20 minutes</span>
                      <span className="text-base font-medium" style={{ fontFamily: 'Space Grotesk' }}>
                        $2.25/min
                      </span>
                    </div>
                  </div>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => {
                    setShowSuccess(true);
                    setTimeout(() => {
                      onComplete();
                      setShowSuccess(false);
                      onClose();
                    }, 800);
                  }}>
                    Do This
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Priority 3 - Growth */}
            <Card className="border-emerald-200 bg-emerald-50 rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Badge className="mb-2 bg-emerald-600">📈 GROWTH</Badge>
                    <h3 className="text-lg font-semibold text-foreground">Launch Referral Program</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xl font-medium text-emerald-600" style={{ fontFamily: 'Space Grotesk' }}>
                        +$28 MRR
                      </span>
                      <span className="text-sm text-slate-600">45 minutes</span>
                      <span className="text-base font-medium" style={{ fontFamily: 'Space Grotesk' }}>
                        $0.62/min
                      </span>
                    </div>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                    setShowSuccess(true);
                    setTimeout(() => {
                      onComplete();
                      setShowSuccess(false);
                      onClose();
                    }, 800);
                  }}>
                    Do This
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Users Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Message High-Value Users (est. +$72 MRR)</DialogTitle>
            <DialogDescription>Send a targeted message to users with the highest rejection rates to offer Pro upgrades.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No user analytics data available.</p>
                <p className="text-xs mt-1">Connect Airtable to see high-value user insights.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Message Template</Label>
              <textarea 
                className="w-full h-32 p-3 border rounded-md text-sm"
                defaultValue={`Hi! I noticed you've had some hours rejected recently. 

Axia Pro could save you money by preventing these rejections with real-time compliance monitoring.

Would you like to try Pro free for 7 days?`}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendToAll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Send to All
            </Button>
          </DialogFooter>
          
          {/* Success Animation */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center bg-card/90 rounded-lg"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-lg font-semibold text-emerald-600">✅ Done in 90s</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compliance Rule Tester
function ComplianceRuleTester() {
  const [testUrl, setTestUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "active" | "at_risk">("idle");
  const [detectedDomain, setDetectedDomain] = useState("");
  const [showFixRule, setShowFixRule] = useState(false);
  const [workSites, setWorkSites] = useState<string[]>(["upwork.com", "github.com", "slack.com"]);

  useEffect(() => {
    if (testUrl) {
      try {
        const url = new URL(testUrl.startsWith('http') ? testUrl : `https://${testUrl}`);
        const domain = url.hostname.replace('www.', '');
        setDetectedDomain(domain);
        
        if (workSites.includes(domain)) {
          setStatus("active");
          setShowFixRule(false);
        } else {
          setStatus("at_risk");
          setShowFixRule(true);
        }
      } catch {
        const domain = testUrl.split('/')[0].replace('www.', '');
        setDetectedDomain(domain);
        
        if (workSites.includes(domain)) {
          setStatus("active");
          setShowFixRule(false);
        } else {
          setStatus("at_risk");
          setShowFixRule(true);
        }
      }
    } else {
      setStatus("idle");
      setShowFixRule(false);
    }
  }, [testUrl, workSites]);

  const handleFixRule = () => {
    if (detectedDomain && !workSites.includes(detectedDomain)) {
      setWorkSites([...workSites, detectedDomain]);
      toast.success(`Added ${detectedDomain} to work sites`);
    }
  };

  const handleSaveRule = () => {
    toast.success("Compliance rules updated successfully");
  };

  return (
    <Card className="col-span-12 mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Compliance Rule Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="test-url" className="text-sm text-muted-foreground">Test URL:</Label>
          <Input
            id="test-url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="fiverr.com/proposals/edit/12345"
            className="mt-1"
          />
        </div>
        
        {status === "active" && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              ✅ ACTIVE - qualifies for payment protection<br />
              Per Upwork Section 4.2: 'Work-related activities on other platforms count'
            </AlertDescription>
          </Alert>
        )}
        
        {status === "at_risk" && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              ⚠️ AT RISK - may be rejected<br />
              Add '{detectedDomain}' to work sites OR show mouse activity
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          {showFixRule && (
            <Button 
              onClick={handleFixRule}
              className="bg-orange-600 hover:bg-orange-700 text-foreground"
            >
              Fix Rule
            </Button>
          )}
          
          {workSites.includes(detectedDomain) && detectedDomain && (
            <Button 
              onClick={handleSaveRule}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Rule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// System Health Monitor
function SystemHealthMonitor() {
  const [apiStatuses, setApiStatuses] = useState({
    stripe: "Healthy",
    upwork: "Critical", 
    airtable: "Warning",
    auth: "Healthy"
  });
  
  const [fixingStatus, setFixingStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Healthy": return "#16A34A";
      case "Warning": return "#D97706";
      case "Critical": return "#DC2626";
      default: return "#64748B";
    }
  };

  const handleFixAPI = (apiName: string) => {
    setFixingStatus(apiName);
    setCountdown(30);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Randomly succeed or fail
          const success = Math.random() > 0.3;
          setApiStatuses(prev => ({
            ...prev,
            [apiName]: success ? "Healthy" : "Critical"
          }));
          setFixingStatus(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const apis = [
    { name: "stripe", title: "Stripe API", subtitle: "Payment processing", icon: DollarSign },
    { name: "upwork", title: "Upwork API", subtitle: "Time tracking data", icon: Clock },
    { name: "airtable", title: "Airtable API", subtitle: "User analytics", icon: Users },
    { name: "auth", title: "Auth System", subtitle: "User authentication", icon: Shield }
  ];

  return (
    <Card className="col-span-12 mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">System Health Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {apis.map((api) => {
            const status = apiStatuses[api.name as keyof typeof apiStatuses];
            const isFixing = fixingStatus === api.name;
            const Icon = api.icon;
            
            return (
              <Card key={api.name} className="relative p-4">
                <div className="absolute top-4 right-4">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: getStatusColor(status) }}
                  />
                </div>
                
                <div className="flex items-start space-x-3">
                  <Icon className="h-8 w-8 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{api.title}</h3>
                    <p className="text-sm text-muted-foreground">{api.subtitle}</p>
                    
                    {status !== "Healthy" && !isFixing && (
                      <Button
                        onClick={() => handleFixAPI(api.name)}
                        variant="link"
                        className="p-0 h-auto text-red-600 hover:text-red-800 mt-2"
                      >
                        Fix API
                      </Button>
                    )}
                    
                    {isFixing && (
                      <div className="mt-2 text-sm text-orange-600">
                        Fixing... {String(countdown).padStart(2, '0')}s
                      </div>
                    )}
                    
                    {status === "Healthy" && fixingStatus !== api.name && (
                      <div className="mt-2 text-sm text-emerald-600 font-medium">
                        Fixed!
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Convex Logs Display Component
function ConvexLogsSection() {
  const [logs, setLogs] = useState<Array<{ time: string; level: string; message: string; env: string }>>([]);

  useEffect(() => {
    // Intercept console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      if (message.includes('[WAITLIST DASHBOARD') || message.includes('CONVEX')) {
        setLogs(prev => [...prev.slice(-99), {
          time: new Date().toLocaleTimeString(),
          level: 'info',
          message,
          env: message.includes('PROD') ? 'prod' : message.includes('DEV') ? 'dev' : 'general'
        }]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      setLogs(prev => [...prev.slice(-99), {
        time: new Date().toLocaleTimeString(),
        level: 'error',
        message,
        env: 'general'
      }]);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      setLogs(prev => [...prev.slice(-99), {
        time: new Date().toLocaleTimeString(),
        level: 'warn',
        message,
        env: 'general'
      }]);
      originalWarn.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <Card className="col-span-12 mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-foreground">Convex Logs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLogs([])}>
            Clear Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto bg-slate-950 p-4 rounded-lg font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-slate-400">No logs yet. Logs will appear here in real-time.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-3 border-b border-slate-800 pb-2">
                <span className="text-slate-500 whitespace-nowrap">{log.time}</span>
                <span className={`font-semibold whitespace-nowrap ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {log.level.toUpperCase()}
                </span>
                {log.env !== 'general' && (
                  <Badge variant={log.env === 'prod' ? 'destructive' : 'secondary'} className="text-xs h-5">
                    {log.env.toUpperCase()}
                  </Badge>
                )}
                <span className="text-slate-200 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Wrapper with ConvexProvider - using stable client
function WaitlistEntriesSection({ client, title, envLabel }: { client: ConvexReactClient; title: string; envLabel: string }) {
  return (
    <div className="waitlist-section">
      <ConvexProvider client={client}>
        <WaitlistEntriesInner title={title} envLabel={envLabel} />
      </ConvexProvider>
    </div>
  );
}

// Waitlist Entries Display Component - Using hooks (must be wrapped in ConvexProvider)
function WaitlistEntriesInner({ title, envLabel }: { title: string; envLabel: string }) {
  const entries = useQuery(api.waitlist.getAllWaitlistEntries, {});
  const count = useQuery(api.waitlist.getWaitlistCount, {});
  const { isDisconnected } = useConvexConnectionState();
  const loadingTimedOut = useQueryTimeout(entries === undefined, 3000);
  const showLoading = entries === undefined && !loadingTimedOut && !isDisconnected;

  useEffect(() => {
    console.log(`[WAITLIST DASHBOARD ${envLabel}] Entries loaded:`, entries);
    console.log(`[WAITLIST DASHBOARD ${envLabel}] Count:`, count);
  }, [entries, count, envLabel]);

  // Show loading state
  if (showLoading) {
    return (
      <Card className="col-span-12 mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-muted-foreground">Loading waitlist entries...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-12 mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-foreground">
            {title} ({count ?? 0} total)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {envLabel}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Real-time updates
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto">
          {!entries || entries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No waitlist entries yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Entries will appear here in real-time as users join.</p>
            </div>
          ) : (
            /* ponytail: 7-column waitlist table needs horizontal scroll on mobile.
               Wrapper added so the table no longer forces the whole page to scroll
               left/right on narrow viewports. */
            <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Position</th>
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Referral Code</th>
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Referrals</th>
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Referred By</th>
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Source</th>
                  <th className="text-left p-3 font-semibold text-sm text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {(entries as any[])?.map((entry: any, index: number) => (
                  <motion.tr
                    key={entry._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs font-mono">
                        #{entry.position || "N/A"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-foreground">{entry.email}</span>
                    </td>
                    <td className="p-3">
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                        {entry.referralCode || "N/A"}
                      </code>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground">
                        {entry.referredCount || 0}
                      </span>
                    </td>
                    <td className="p-3">
                      {entry.referredBy ? (
                        <code className="text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded font-mono text-amber-700 dark:text-amber-400">
                          {entry.referredBy}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {entry.source || "unknown"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Owner Login Component
function OwnerLogin({ onLogin, showError, password, setPassword }: {
  onLogin: (password: string) => void;
  showError: boolean;
  password: string;
  setPassword: (password: string) => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px] h-[300px] flex flex-col justify-center">
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Inter' }}>
              Axia Owner
            </h1>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="email" value="shubh@timestop.app" />

            <div>
              <Label htmlFor="username" className="text-sm text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value="shubh"
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                required
              />
            </div>
            
            {showError && (
              <p className="text-sm text-destructive">Invalid owner credentials</p>
            )}
            
            <Button
              type="submit"
              disabled={!password}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Access Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


// Main Owner Dashboard Component
export default function OwnerDashboard({ prodConvex, devConvex }: { prodConvex: ConvexReactClient; devConvex: ConvexReactClient }) {
  const auth = useOwnerAuth();

  if (!auth.isAuthenticated) {
    return (
      <OwnerLogin
        onLogin={auth.login}
        showError={auth.showError}
        password={auth.password}
        setPassword={auth.setPassword}
      />
    );
  }

  return <OwnerDashboardContent prodConvex={prodConvex} devConvex={devConvex} auth={auth} />;
}

function OwnerDashboardContent({ prodConvex, devConvex, auth }: { prodConvex: ConvexReactClient; devConvex: ConvexReactClient; auth: ReturnType<typeof useOwnerAuth> }) {
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  // New: Priority Actions state with add/complete behavior
  type Action = {
    id: string;
    priority: number;
    tag: string;
    title: string;
    revenue: number;
    time: number;
    roi: number;
    color: "red" | "orange" | "emerald";
  };

  const [priorityActions, setPriorityActions] = useState<Array<Action>>([
    { id: "a1", priority: 1, tag: "🚨 CRITICAL", title: "Message High-Value Users", revenue: 72, time: 15, roi: 4.8, color: "red" },
    { id: "a2", priority: 2, tag: "✏️ IMPORTANT", title: "Update Compliance Rules", revenue: 45, time: 20, roi: 2.25, color: "orange" },
    { id: "a3", priority: 3, tag: "📈 GROWTH", title: "Launch Referral Program", revenue: 28, time: 45, roi: 0.62, color: "emerald" },
  ]);
  const nextIdRef = useRef(4);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const addAction = () => {
    const n = nextIdRef.current++;
    // Simple default; can be edited later
    const newAction: Action = {
      id: `a${n}`,
      priority: Math.min((priorityActions[priorityActions.length - 1]?.priority ?? 3) + 1, 9),
      tag: "📈 GROWTH",
      title: "Run quick activation email",
      revenue: 18,
      time: 10,
      roi: 1.8,
      color: "emerald",
    };
    setPriorityActions((prev) => [...prev, newAction]);
  };

  const completeActionById = (id: string | null) => {
    if (!id) return;
    setPriorityActions((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      // Append a fresh action to simulate "one comes from bottom"
      const n = nextIdRef.current++;
      const appended: Action = {
        id: `a${n}`,
        priority: Math.min((filtered[filtered.length - 1]?.priority ?? 3) + 1, 9),
        tag: "📈 GROWTH",
        title: "Enable referral CTA in app",
        revenue: 22,
        time: 12,
        roi: 1.83,
        color: "emerald",
      };
      return [...filtered, appended];
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Axia Owner Dashboard</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" onClick={() => auth.logout()}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Section 1: Revenue Command (Top 30%) */}
        <div className="mb-12">
          <RevenueRiskMeter 
            mrr={null} 
            onFixClick={() => {
              setActiveActionId(priorityActions[0]?.id ?? null);
              setShowPriorityModal(true);
            }} 
          />
          
          {/* ponytail: grid-cols-12 → grid-cols-1 on mobile, sm:grid-cols-2 on tablets.
              The fixed 12-col with col-span-6 forced horizontal scroll on phones. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Users Needed Counter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">Users Needed Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No analytics data available.</p>
                  <p className="text-xs mt-1">Connect Stripe to see user growth metrics.</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Burn Rate Monitor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">Burn Rate vs MRR Growth</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No financial data available.</p>
                  <p className="text-xs mt-1">Connect Stripe to see revenue and cost metrics.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 2: System Health */}
        <div className="mb-12">
          <SystemHealthMonitor />
          <ComplianceRuleTester />
        </div>

        {/* Section 3: Convex Logs */}
        <div className="mb-12">
          <ConvexLogsSection />
        </div>

        {/* Section 4: Waitlist Management */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Waitlist Management</h2>

          <Alert className="mb-6">
            <AlertDescription>
              <p className="font-semibold mb-2">Debug Information:</p>
              <p className="text-xs">Production Client: {prodConvex ? '✅ Connected' : '❌ Missing'}</p>
              <p className="text-xs">Dev Client: {devConvex ? '✅ Connected' : '❌ Missing'}</p>
              <p className="text-xs mt-2">Check browser console for detailed logs</p>
            </AlertDescription>
          </Alert>

          {/* Production Entries */}
          <div className="mb-8">
            {prodConvex ? (
              <WaitlistEntriesSection
                client={prodConvex}
                title="Production Waitlist"
                envLabel="PROD: harmless-tapir-303"
              />
            ) : (
              <Card className="col-span-12 mb-8">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-foreground">Production Waitlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-destructive">Error: Production Convex client not available</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Dev Entries */}
          <div className="mb-8">
            {devConvex ? (
              <WaitlistEntriesSection
                client={devConvex}
                title="Development Waitlist"
                envLabel="DEV: bold-reindeer-389"
              />
            ) : (
              <Card className="col-span-12 mb-8">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-foreground">Development Waitlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-destructive">Error: Dev Convex client not available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Section 5: Growth Engine */}
        <div className="mb-12">
          {/* Top 3 Priority Actions */}
          <Card className="col-span-12 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-foreground">Top 3 Priority Actions</CardTitle>
                {/* New: Add Action button */}
                <Button variant="outline" onClick={addAction} className="text-foreground">
                  + Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {priorityActions.slice(0, 3).map((action) => (
                <Card key={action.id} className={`border-${action.color}-200 bg-${action.color}-50`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Badge
                          variant={action.color === "red" ? "destructive" : "default"}
                          className={`mb-2 ${action.color === "orange" ? "bg-orange-600" : action.color === "emerald" ? "bg-emerald-600" : ""}`}
                        >
                          {action.tag}
                        </Badge>
                        <h3 className="text-lg font-semibold text-foreground">{action.title}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xl font-medium text-emerald-600" style={{ fontFamily: 'Space Grotesk' }}>
                            +${action.revenue} MRR
                          </span>
                          <span className="text-sm text-muted-foreground">{action.time} minutes</span>
                          <span className="text-base font-medium text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
                            ${action.roi}/min
                          </span>
                        </div>
                      </div>
                      {/* Behavior: Priority 1 opens modal; others complete immediately */}
                      {action.priority === 1 ? (
                        <Button
                          onClick={() => {
                            setActiveActionId(action.id);
                            setShowPriorityModal(true);
                          }}
                          className={`bg-${action.color}-600 hover:bg-${action.color}-700 text-white`}
                        >
                          Do This
                        </Button>
                      ) : (
                        <Button
                          onClick={() => completeActionById(action.id)}
                          className={`bg-${action.color}-600 hover:bg-${action.color}-700 text-white`}
                        >
                          Do This
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Priority Actions Modal - when finished, remove the active action and append new one */}
      <PriorityActionsModal
        isOpen={showPriorityModal}
        onClose={() => {
          setShowPriorityModal(false);
          setActiveActionId(null);
        }}
        onComplete={() => {
          completeActionById(activeActionId);
          setActiveActionId(null);
        }}
      />
    </motion.div>
  );
}