/**
 * Owner Dashboard — full 7-tab owner-only dashboard.
 *
 * Auth: Better Auth session + role === "owner" (checked at Convex query layer).
 * The React route guard (in main.tsx ProtectedRoute) checks BA session;
 * the Convex queries/actions check role === "owner" for real enforcement.
 *
 * Layout:
 *   - Sticky header: title + hero KPI bar + refresh + theme toggle
 *   - Tab strip: Overview / Revenue / Product / Errors / Infrastructure / Users / Realtime
 *   - Alerts side rail (collapsible)
 *   - Tab content area
 *
 * Data flow:
 *   - Each tab uses a hook (useOverview, useRevenue, etc.) that:
 *     1. Reads from Convex dashboardCache (instant if available)
 *     2. Triggers a refresh action if cache is empty/stale
 *     3. Polls on a tab-specific interval (5s realtime, 30s errors, 60s others)
 *
 * Replaces the old OWNER_PASSWORD-gated OwnerDashboard.tsx entirely.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  DollarSign,
  BarChart3,
  AlertCircle,
  Server,
  Users,
  Radio,
  Bell,
  PanelRightClose,
  PanelRightOpen,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useHeroKpis, useAlerts, useIsOwner } from "@/components/owner-dashboard/hooks";
import { HeroKpiBar } from "@/components/owner-dashboard/shared";
import { OverviewTab } from "@/components/owner-dashboard/tabs/OverviewTab";
import { RevenueTab } from "@/components/owner-dashboard/tabs/RevenueTab";
import { ProductTab } from "@/components/owner-dashboard/tabs/ProductTab";
import { ErrorsTab } from "@/components/owner-dashboard/tabs/ErrorsTab";
import { InfrastructureTab } from "@/components/owner-dashboard/tabs/InfrastructureTab";
import { UsersTab } from "@/components/owner-dashboard/tabs/UsersTab";
import { RealtimeTab } from "@/components/owner-dashboard/tabs/RealtimeTab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "product", label: "Product", icon: BarChart3 },
  { id: "errors", label: "Errors", icon: AlertCircle },
  { id: "infrastructure", label: "Infrastructure", icon: Server },
  { id: "users", label: "Users", icon: Users },
  { id: "realtime", label: "Real-time", icon: Radio },
] as const;

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [alertsOpen, setAlertsOpen] = useState(true);

  const { data: kpis, isRefreshing: kpisLoading, refresh: refreshKpis } = useHeroKpis();
  const { data: alertsData } = useAlerts();
  const isOwner = useIsOwner();

  const alerts = alertsData?.alerts ?? [];

  // If not an owner, show access denied
  if (isOwner === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
            <p className="text-sm text-muted-foreground mb-4">
              You need owner privileges to access this page. If you believe this is an error,
              contact your administrator.
            </p>
            <Button asChild>
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 space-y-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">Axia Owner Dashboard</h1>
              <Badge variant="outline" className="text-xs">v7.0</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={refreshKpis} disabled={kpisLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${kpisLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAlertsOpen(!alertsOpen)}
              >
                {alertsOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  App
                </a>
              </Button>
            </div>
          </div>

          {/* Hero KPI bar */}
          <HeroKpiBar kpis={kpis} isLoading={kpisLoading && !kpis} />
        </div>
      </header>

      {/* Main content with alerts rail */}
      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="overview"><OverviewTab /></TabsContent>
            <TabsContent value="revenue"><RevenueTab /></TabsContent>
            <TabsContent value="product"><ProductTab /></TabsContent>
            <TabsContent value="errors"><ErrorsTab /></TabsContent>
            <TabsContent value="infrastructure"><InfrastructureTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="realtime"><RealtimeTab /></TabsContent>
          </Tabs>
        </div>

        {/* Alerts side rail */}
        {alertsOpen && (
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-32">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Alerts
                    </h3>
                    {alerts.length > 0 && (
                      <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>
                    )}
                  </div>
                  {alerts.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-2">
                        <span className="text-green-600 text-lg">✓</span>
                      </div>
                      <p className="text-xs text-muted-foreground">All systems healthy</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map((alert: any, i: number) => (
                        <div
                          key={i}
                          className={`p-2 rounded-md border text-xs ${
                            alert.severity === "critical"
                              ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                              : alert.severity === "high"
                                ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20"
                                : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-medium">{alert.title}</span>
                            <Badge
                              variant={alert.severity === "critical" ? "destructive" : "secondary"}
                              className="text-xs flex-shrink-0"
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-1">{alert.detail}</p>
                          {alert.link && (
                            <a
                              href={alert.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              View <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick links */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-2">Quick Links</h3>
                  <div className="space-y-1 text-xs">
                    <a href="https://sentry.io/axia" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                      <ExternalLink className="h-3 w-3" /> Sentry Dashboard
                    </a>
                    <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                      <ExternalLink className="h-3 w-3" /> PostHog Dashboard
                    </a>
                    <a href="https://vercel.com/axia" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                      <ExternalLink className="h-3 w-3" /> Vercel Dashboard
                    </a>
                    <a href="https://vendors.paddle.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                      <ExternalLink className="h-3 w-3" /> Paddle Dashboard
                    </a>
                    <a href="https://dashboard.convex.dev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                      <ExternalLink className="h-3 w-3" /> Convex Dashboard
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
