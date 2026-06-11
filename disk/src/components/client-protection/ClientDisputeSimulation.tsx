import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, CheckCircle, BarChart } from "lucide-react";

interface ClientDisputeSimulationProps {
  clientData: any;
  tier: string;
}

export function ClientDisputeSimulation({ clientData, tier }: ClientDisputeSimulationProps) {
  // Dynamic value calculations based on 4-Pillar validated problems
  const weeklyHours = clientData.weeklyHours || 0;
  const hourlyRate = clientData.hourlyRate || 25;
  const weeklyValue = weeklyHours * hourlyRate;
  const monthlyValue = weeklyValue * 4.33;
  
  // Pillar 1: Evidence Collection
  const evidenceCount = clientData.evidenceCount || 0;
  const trackedValue = Math.round(weeklyValue * 0.22); // Free tier: 22% protection
  
  // Pillar 2: Compliance Monitoring
  const activityDensity = clientData.activityDensity || 0;
  const verificationScore = Math.min(100, Math.round((activityDensity * 50) + ((clientData.memoQuality || 0) * 50)));
  
  // Pillar 3: Dispute Prevention
  const contextGaps = clientData.platformGaps || 0;
  const memoScore = Math.min(100, Math.round(
    (clientData.avgMemoWords >= 7 ? 40 : 0) +
    (clientData.clientKeywords > 0 ? 30 : 0) +
    ((clientData.memoSpecificity || 0) > 0.7 ? 30 : 0)
  ));
  
  // Pillar 4: Success Optimization
  const requirementAlignment = clientData.requirementAlignment || 0;
  const weeklyProtection = Math.round(requirementAlignment * weeklyValue);
  const preventedValue = Math.round(monthlyValue * Math.min(0.83, activityDensity * 0.4 + (clientData.memoQuality || 0) * 0.43));
  const expertProtection = Math.round(monthlyValue * 0.95);

  // FREE TIER - Basic Payment Protection (Pillar 1: Evidence Collection)
  if (tier === "free") {
    const activityStatus = activityDensity >= 1.5 ? "good" : activityDensity >= 1.0 ? "warning" : "critical";
    
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Basic Payment Protection
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Is my work being tracked correctly?
            </p>
          </div>
          <span className="bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Free
          </span>
        </div>
        
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-900 dark:text-slate-100 text-base mb-1">
            You've protected <span className="text-2xl font-bold text-teal-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${trackedValue}</span>/week
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            by identifying timeline risks
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Evidence Timeline</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {evidenceCount} items
            </div>
            <div className="text-xs text-slate-500 mt-1">85% experience late payments</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Basic Verification</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {verificationScore}%
            </div>
            <div className="text-xs text-slate-500 mt-1">65% have payment disputes</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Memo Quality Check</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {contextGaps} gaps
            </div>
            <div className="text-xs text-slate-500 mt-1">57% disputes from vague memos</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Activity Density</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {activityDensity.toFixed(1)} events/min
            </div>
            <div className={`text-xs mt-1 font-semibold ${
              activityStatus === 'good' ? 'text-green-600' : 
              activityStatus === 'warning' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {activityStatus === 'good' ? '✓ Good' : activityStatus === 'warning' ? '⚠ Warning' : '✗ Critical'}
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
          <p className="text-amber-900 dark:text-amber-100 text-sm font-semibold mb-2">
            Get contextual protection
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
            Prevent ${Math.round(weeklyValue * 0.35)}/week in context-related payment denials
          </p>
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold">
            Upgrade to Starter → $4/mo
          </Button>
        </div>
      </Card>
    );
  }

  // STARTER TIER - Contextual Protection (Pillar 2: Compliance Monitoring)
  if (tier === "starter") {
    const platformGaps = clientData.platformGaps || 0;
    const riskCount = clientData.highRiskGaps || 0;
    
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl text-blue-900 dark:text-blue-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Contextual Protection
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
              Is my work contextually relevant for payment?
            </p>
          </div>
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Starter
          </span>
        </div>
        
        <div className="mb-6 p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
          <p className="text-blue-900 dark:text-blue-100 text-base mb-1">
            You're protecting <span className="text-2xl font-bold text-blue-600 dark:text-blue-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${weeklyProtection}</span>/week
          </p>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            from context-related payment denials
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Client Requirement Mapping</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              ${weeklyProtection}/week
            </div>
            <div className="text-xs text-blue-500 mt-1">49% disputes from misalignment</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Memo Enhancement</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {memoScore}/100
            </div>
            <div className="text-xs text-blue-500 mt-1">57% disputes from vague memos</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Platform-Specific Guidance</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {platformGaps} gaps fixed
            </div>
            <div className="text-xs text-blue-500 mt-1">Platform-specific denials</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Dispute Risk Identification</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {riskCount} risks fixed
            </div>
            <div className="text-xs text-blue-500 mt-1">65% have payment disputes</div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
          <p className="text-amber-900 dark:text-amber-100 text-sm font-semibold mb-2">
            Prevent payment denials
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
            Prevent ${Math.round(monthlyValue * 0.48)}/month in payment denials with comprehensive protection
          </p>
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold">
            Upgrade to Pro → $7/mo
          </Button>
        </div>
      </Card>
    );
  }

  // PRO TIER - Comprehensive Protection (Pillar 3: Dispute Prevention)
  if (tier === "pro") {
    const templateCount = clientData.templates?.length || 5;
    const timeSaved = clientData.timeSaved || 12;
    const successRate = 83;
    const complianceRate = Math.min(100, Math.round((clientData.upworkCompliance || 0) + (clientData.fiverrCompliance || 0) + (clientData.toptalCompliance || 0)) / 3);
    
    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-xl text-amber-900 dark:text-amber-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Comprehensive Protection
            </h3>
            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
              Is my work fully payment-protected?
            </p>
          </div>
          <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Pro
          </span>
        </div>
        
        <div className="mb-6 p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
          <p className="text-amber-900 dark:text-amber-100 text-base mb-1">
            You're preventing <span className="text-2xl font-bold text-amber-600 dark:text-amber-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${preventedValue}</span>/month
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            in potential payment losses
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
            <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Real-Time Prevention</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              ${preventedValue}
            </div>
            <div className="text-xs text-amber-500 mt-1">63% disputes from low activity</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
            <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Client-Specific Templates</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {templateCount} templates
            </div>
            <div className="text-xs text-amber-500 mt-1">Saved {timeSaved} hours</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
            <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Dispute Simulation</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {successRate}%
            </div>
            <div className="text-xs text-amber-500 mt-1">39% lose income from disputes</div>
          </div>
          
          <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
            <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Platform Compliance</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {complianceRate}%
            </div>
            <div className="text-xs text-amber-500 mt-1">Platform-specific rules</div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
          <p className="text-purple-900 dark:text-purple-100 text-sm font-semibold mb-2">
            Protect your entire business
          </p>
          <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
            Protect ${Math.round(monthlyValue * 0.95)}/month across all projects with business-wide protection
          </p>
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold">
            Upgrade to Expert → $12/mo
          </Button>
        </div>
      </Card>
    );
  }

  // EXPERT TIER - Business-Level Protection (Pillar 4: Success Optimization)
  const reliabilityScore = 87;
  const milestonesProtected = 8;
  const disputeSuccessRate = 95;

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-2xl border-2 border-purple-200 dark:border-purple-700">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-xl text-purple-900 dark:text-purple-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Business-Level Protection
          </h3>
          <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
            Is my entire business protected from payment denials?
          </p>
        </div>
        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Expert
        </span>
      </div>
      
      <div className="mb-6 p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
        <p className="text-purple-900 dark:text-purple-100 text-base mb-1">
          You're protecting <span className="text-2xl font-bold text-purple-600 dark:text-purple-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${expertProtection}</span>/month
        </p>
        <p className="text-purple-700 dark:text-purple-300 text-sm">
          across all projects through business-wide protection
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Business-Wide Mapping</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            ${expertProtection}
          </div>
          <div className="text-xs text-purple-500 mt-1">32% have cross-project issues</div>
        </div>
        
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Payment Pattern Analysis</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {reliabilityScore}%
          </div>
          <div className="text-xs text-purple-500 mt-1">58% experience non-payment</div>
        </div>
        
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Strategic Milestone Protection</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {milestonesProtected}
          </div>
          <div className="text-xs text-purple-500 mt-1">39% lose income from disputes</div>
        </div>
        
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Automated Dispute Resolution</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {disputeSuccessRate}%
          </div>
          <div className="text-xs text-purple-500 mt-1">65% have payment disputes</div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
        <p className="text-green-900 dark:text-green-100 text-sm font-semibold text-center">
          ✓ Top-tier protection complete
        </p>
      </div>
    </Card>
  );
}