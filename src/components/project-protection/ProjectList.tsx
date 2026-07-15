import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, AlertTriangle, Lock, Tag as TagIcon } from "lucide-react";
// ponytail: read-only badge display + multi-select picker popover for project cards.
import { TagPicker, TagBadges } from "@/components/tags";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Project {
  _id: string;
  projectName: string;
  hourlyRate: number;
  projectType: string;
  protectionLevel: string;
  protectionScore: number;
  totalHours: number;
  totalValue: number;
  atRiskAmount: number;
  activeSession: boolean;
  rejectedHours: number;
  // ponytail: optional tagIds on the project (added by phase-1a schema patch).
  tagIds?: string[];
}

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onAddProject: () => void;
  subscriptionTier?: "free" | "starter" | "pro" | "expert";
  onUpgrade?: () => void;
  // ponytail: workspace tag list for rendering TagBadges + the Manage Tags popover.
  allTags?: any[];
}

export function ProjectList({ 
  projects, 
  selectedProjectId, 
  onSelectProject, 
  onAddProject,
  subscriptionTier = "free",
  onUpgrade,
  allTags = []
}: ProjectListProps) {
  // ponytail: track which project's "Manage tags" popover is currently open.
  const [manageTagsFor, setManageTagsFor] = useState<string | null>(null);
  const getProtectionColor = (level: string) => {
    switch (level) {
      case "standard": return "text-blue-500 bg-blue-500/10";
      case "enhanced": return "text-purple-500 bg-purple-500/10";
      case "maximum": return "text-emerald-500 bg-emerald-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  // Tier-based features
  const hasAdvancedMetrics = subscriptionTier === "pro" || subscriptionTier === "expert";
  const hasProjectInsights = subscriptionTier === "expert";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Project Protection Workspace
          </CardTitle>
          <Button size="sm" onClick={onAddProject}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!projects || projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No projects yet. Add your first project to start tracking protection.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div 
                key={project._id} 
                className={`p-4 border border-border rounded-lg hover:bg-muted/50 transition cursor-pointer ${
                  selectedProjectId === project._id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelectProject(project._id === selectedProjectId ? null : project._id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-foreground">{project.projectName}</div>
                      <div className="text-sm text-muted-foreground">
                        ${project.hourlyRate}/hr · {project.projectType}
                      </div>
                      {/* ponytail: read-only tag badges on each project card. */}
                      <div className="mt-1">
                        <TagBadges
                          tagIds={project.tagIds}
                          tags={allTags}
                          max={3}
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ponytail: Manage-tags popover — TagPicker with entityId persists
                        immediately via setEntityTags, so no extra save logic needed. */}
                    <Popover open={manageTagsFor === project._id} onOpenChange={(o) => setManageTagsFor(o ? project._id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); setManageTagsFor(project._id); }}
                          title="Manage tags"
                        >
                          <TagIcon className="h-3.5 w-3.5 mr-1" />
                          Tags
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px]" align="end" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Tags for {project.projectName}</div>
                          <TagPicker
                            entityType="projects"
                            entityId={project._id}
                            initialTagIds={project.tagIds ?? []}
                            categoryHint="project"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Badge className={getProtectionColor(project.protectionLevel)}>
                      {project.protectionLevel} protection
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Protection Score</div>
                    <div className="text-lg font-bold text-foreground">{project.protectionScore}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Hours</div>
                    <div className="text-lg font-bold text-foreground">{project.totalHours}h</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="text-lg font-bold text-emerald-500">${project.totalValue}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">At Risk</div>
                    <div className="text-lg font-bold text-red-500">${project.atRiskAmount}</div>
                  </div>
                </div>
                {project.activeSession && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    Active session
                  </div>
                )}
                {project.rejectedHours > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                    <AlertTriangle className="h-3 w-3" />
                    {project.rejectedHours}h rejected - Generate dispute report
                  </div>
                )}
                
                {/* Advanced Project Insights - Tier-based */}
                {selectedProjectId === project._id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {hasProjectInsights ? (
                      <div className="text-sm space-y-2">
                        <div className="font-medium text-foreground">AI Project Insights</div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Dispute Risk:</span>
                            <span className="font-medium text-emerald-500">Low (8%)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Completion Trend:</span>
                            <span className="font-medium">On Track</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Evidence Quality:</span>
                            <span className="font-medium text-emerald-500">Excellent</span>
                          </div>
                        </div>
                      </div>
                    ) : hasAdvancedMetrics ? (
                      <div className="text-sm space-y-2">
                        <div className="font-medium text-foreground">Project Metrics</div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Evidence Coverage:</span>
                            <span className="font-medium">87%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Compliance Rate:</span>
                            <span className="font-medium text-emerald-500">92%</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border text-center">
                          <p className="text-xs text-muted-foreground mb-2">
                            Unlock AI-powered project insights
                          </p>
                          <Button size="sm" variant="outline" onClick={onUpgrade}>
                            <Lock className="h-3 w-3 mr-1" />
                            Upgrade to Expert
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 bg-muted/50 rounded-lg">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground mb-1">
                          Advanced Project Analytics
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Track metrics, trends, and AI-powered insights
                        </p>
                        <Button size="sm" onClick={onUpgrade}>
                          Upgrade to PRO
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}