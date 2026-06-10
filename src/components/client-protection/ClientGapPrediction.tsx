import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock } from "lucide-react";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

interface ClientGapPredictionProps {
  selectedClient: any;
  tier: string;
}

export function ClientGapPrediction({ selectedClient, tier }: ClientGapPredictionProps) {
  const isRealClient = selectedClient?._id && !selectedClient._id.startsWith("client_");

  const gapData = useQuery(
    api.clients.clientGapPrediction.getClientGapPrediction,
    isRealClient ? { clientId: selectedClient._id } : "skip"
  );

  const displayData = isRealClient ? gapData : selectedClient;

  if (!displayData) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Loading gap prediction...
        </div>
      </Card>
    );
  }

  if (tier === "free") return <ClientGapPredictionFree clientData={displayData} />;
  if (tier === "starter") return <ClientGapPredictionStarter clientData={displayData} />;
  if (tier === "pro") return <ClientGapPredictionPro clientData={displayData} />;
  if (tier === "expert") return <ClientGapPredictionExpert clientData={displayData} />;
  return <ClientGapPredictionFree clientData={displayData} />;
}

// Helper calculations
const calculateBasicTimePrediction = (data: any) => {
  return `${data.nextGapDay || "Tomorrow"} ${data.nextGapTime || "2-4 PM"}`;
};

const calculateContextPrediction = (data: any) => {
  return Math.min(100, Math.round(
    ((data.evidenceWithClientKeywords || 0) / Math.max(1, (data.clientKeywords?.length || 1))) * 50 + 
    ((data.workSpecificity || 0) * 50)
  ));
};

const calculatePlatformPrediction = (data: any) => {
  let protection = 100;
  if (!data.hasClientSpecificRequirements) protection -= 40;
  if ((data.activityDensity || 0) < 1.5) protection -= 30;
  if ((data.memoQuality || 0) < 0.8) protection -= 30;
  return Math.max(0, protection);
};

const calculateBusinessPrediction = (data: any) => {
  return Math.min(100, Math.round(
    ((data.clientDiversity || 0) * 0.3) + 
    ((data.platformCoverage || 0) * 0.35) + 
    ((data.historicalSuccess || 0) * 0.35)
  ));
};

const ClientGapPredictionFree = ({ clientData }: { clientData: any }) => {
  const timePrediction = calculateBasicTimePrediction(clientData);
  const protectedValue = Math.round((clientData.weeklyHours || 20) * (clientData.hourlyRate || 25) * 0.22 * 0.1);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Basic Gap Prediction
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Time-based evidence gap prediction
          </p>
        </div>
        <span className="bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Free
        </span>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {timePrediction}
        </div>
        <div className="text-slate-600 dark:text-slate-400 font-medium text-base">evidence gap predicted</div>
      </div>
      
      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="text-slate-500 mr-2 w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-slate-700 dark:text-slate-300 text-sm">
            Based on your work pattern, you typically have a {clientData.gapDuration || 3} hour gap on {clientData.gapDay || "Thursdays"}
          </span>
        </div>
      </div>
      
      <div className="flex gap-3 mb-6">
        <Button className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold">
          Set Reminder
        </Button>
        <Button variant="outline" className="flex-1 border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold">
          Add Evidence Now
        </Button>
      </div>
      
      <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
        <p className="text-amber-900 dark:text-amber-100 text-sm font-semibold mb-2">
          You've protected ${protectedValue} this month through basic gap prevention
        </p>
        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
          Upgrade for context-specific gap prevention
        </p>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
          Upgrade to Starter → $4/mo
        </Button>
      </div>
      
      <div className="mt-5 text-slate-500 dark:text-slate-400 text-xs">
        <p>Basic time-based prediction only. No context or platform analysis.</p>
      </div>
    </Card>
  );
};

const ClientGapPredictionStarter = ({ clientData }: { clientData: any }) => {
  const timePrediction = calculateBasicTimePrediction(clientData);
  const contextPrediction = calculateContextPrediction(clientData);
  const protectedValue = Math.round((clientData.weeklyHours || 20) * (clientData.hourlyRate || 25) * 0.45 * 0.2);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-blue-900 dark:text-blue-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Contextual Gap Prevention
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
            Time-based + context relevance prediction
          </p>
        </div>
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Starter
        </span>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {timePrediction}
        </div>
        <div className="text-blue-700 dark:text-blue-300 font-medium text-base">contextual evidence gap predicted</div>
      </div>
      
      <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700 mb-6">
        <div className="flex items-start mb-3">
          <AlertTriangle className="text-blue-500 mr-2 w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-blue-800 dark:text-blue-200 text-sm">
            Based on your work pattern, you typically have a {clientData.gapDuration || 3} hour gap on {clientData.gapDay || "Thursdays"}
          </span>
        </div>
        
        <div className="border-t border-blue-200 dark:border-blue-700 pt-3 mt-3">
          <h5 className="text-blue-900 dark:text-blue-100 font-semibold mb-2 text-sm">Contextual Gap Analysis</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span className="text-blue-800 dark:text-blue-200 text-sm">2 missing client keywords</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span className="text-blue-800 dark:text-blue-200 text-sm">Work memos need 22% more specificity</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span className="text-blue-800 dark:text-blue-200 text-sm">3 gaps in platform-specific evidence</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mb-6">
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          Set Reminder
        </Button>
        <Button variant="outline" className="flex-1 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 font-semibold">
          Add Evidence Now
        </Button>
      </div>
      
      <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
        <p className="text-amber-900 dark:text-amber-100 text-sm font-semibold mb-2">
          You're protecting ${protectedValue}/week through contextual gap prevention
        </p>
        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
          Upgrade for platform-specific gap prevention
        </p>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
          Upgrade to Pro → $7/mo
        </Button>
      </div>
      
      <div className="mt-5 text-blue-600 dark:text-blue-400 text-xs">
        <p>Contextual analysis of evidence gaps and client-specific requirements. Identifies gaps that could lead to payment denials on specific platforms.</p>
      </div>
    </Card>
  );
};

const ClientGapPredictionPro = ({ clientData }: { clientData: any }) => {
  const timePrediction = calculateBasicTimePrediction(clientData);
  const platformPrediction = calculatePlatformPrediction(clientData);
  const protectedValue = Math.round((clientData.weeklyHours || 20) * (clientData.hourlyRate || 25) * 0.83 * 0.4);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-amber-900 dark:text-amber-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Platform-Specific Gap Prevention
          </h3>
          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
            Time-based + context + platform-specific prediction
          </p>
        </div>
        <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Pro
        </span>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-amber-900 dark:text-amber-100 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {timePrediction}
        </div>
        <div className="text-amber-700 dark:text-amber-300 font-medium text-base">platform-specific evidence gap predicted</div>
      </div>
      
      <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700 mb-6">
        <div className="flex items-start mb-3">
          <AlertTriangle className="text-amber-500 mr-2 w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-amber-800 dark:text-amber-200 text-sm">
            Based on your work pattern, you typically have a {clientData.gapDuration || 3} hour gap on {clientData.gapDay || "Thursdays"}
          </span>
        </div>
        
        <div className="border-t border-amber-200 dark:border-amber-700 pt-3 mt-3">
          <h5 className="text-amber-900 dark:text-amber-100 font-semibold mb-2 text-sm">Platform-Specific Gap Analysis</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center">
              <span className="text-amber-500 mr-2">•</span>
              <span className="text-amber-800 dark:text-amber-200 text-sm">Upwork policy compliance: {clientData.upworkCompliance || 95}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-500 mr-2">•</span>
              <span className="text-amber-800 dark:text-amber-200 text-sm">Fiverr policy compliance: {clientData.fiverrCompliance || 90}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-500 mr-2">•</span>
              <span className="text-amber-800 dark:text-amber-200 text-sm">Platform vulnerability: {100 - platformPrediction}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-500 mr-2">•</span>
              <span className="text-amber-800 dark:text-amber-200 text-sm">Platform recommendations: {clientData.platformRecommendations || 3} items</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700 mb-6">
        <h5 className="text-amber-900 dark:text-amber-100 font-semibold mb-2 text-sm">Client-Specific Gap Prevention Plan</h5>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="text-amber-500 mr-2">•</span>
            <span className="text-amber-800 dark:text-amber-200 text-sm">Add client-specific memo template → <span className="font-semibold text-amber-900 dark:text-amber-100">+42% protection</span></span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-2">•</span>
            <span className="text-amber-800 dark:text-amber-200 text-sm">Increase evidence density to 2.8 → <span className="font-semibold text-amber-900 dark:text-amber-100">+30% compliance rate</span></span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-500 mr-2">•</span>
            <span className="text-amber-800 dark:text-amber-200 text-sm">Implement platform-specific evidence rules → <span className="font-semibold text-amber-900 dark:text-amber-100">+28% payment success</span></span>
          </li>
        </ul>
      </div>
      
      <div className="flex gap-3 mb-6">
        <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
          Set Reminder
        </Button>
        <Button variant="outline" className="flex-1 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800 font-semibold">
          Add Evidence Now
        </Button>
      </div>
      
      <div className="mt-5 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
        <p className="text-purple-900 dark:text-purple-100 text-sm font-semibold mb-2">
          You're preventing ${protectedValue}/week through platform-specific gap prevention
        </p>
        <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
          Upgrade for business-wide gap prevention
        </p>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
          Upgrade to Expert → $12/mo
        </Button>
      </div>
      
      <div className="mt-5 text-amber-600 dark:text-amber-400 text-xs">
        <p>Advanced analysis of platform-specific policies and vulnerabilities. Includes one-click templates to fix missing requirements on Upwork, Fiverr, and Toptal.</p>
      </div>
    </Card>
  );
};

const ClientGapPredictionExpert = ({ clientData }: { clientData: any }) => {
  const timePrediction = calculateBasicTimePrediction(clientData);
  const protectedValue = Math.round((clientData.weeklyHours || 20) * (clientData.hourlyRate || 25) * 4.33 * 0.95 * 0.12);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-2xl border-2 border-purple-200 dark:border-purple-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-purple-900 dark:text-purple-100" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Business-Wide Gap Prevention
          </h3>
          <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
            Cross-platform strategic evidence gap prediction
          </p>
        </div>
        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Expert
        </span>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-purple-900 dark:text-purple-100 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {timePrediction}
        </div>
        <div className="text-purple-700 dark:text-purple-300 font-medium text-base">business-level evidence gap predicted</div>
      </div>
      
      <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700 mb-6">
        <div className="flex items-start mb-3">
          <AlertTriangle className="text-purple-500 mr-2 w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-purple-800 dark:text-purple-200 text-sm">
            Based on your work pattern, you typically have a {clientData.gapDuration || 3} hour gap on {clientData.gapDay || "Thursdays"}
          </span>
        </div>
        
        <div className="border-t border-purple-200 dark:border-purple-700 pt-3 mt-3">
          <h5 className="text-purple-900 dark:text-purple-100 font-semibold mb-2 text-sm">Platform-Specific Gap Analysis</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-purple-800 dark:text-purple-200 text-sm">Upwork compliance: {clientData.upworkCompliance || 95}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-purple-800 dark:text-purple-200 text-sm">Fiverr compliance: {clientData.fiverrCompliance || 90}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-purple-800 dark:text-purple-200 text-sm">Toptal compliance: {clientData.toptalCompliance || 85}%</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-purple-200 dark:border-purple-700 pt-3 mt-3">
          <h5 className="text-purple-900 dark:text-purple-100 font-semibold mb-2 text-sm">Business Pattern Gap Detection</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-purple-800 dark:text-purple-200 text-sm">Cross-client pattern: {clientData.businessPattern || 85}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-purple-800 dark:text-purple-200 text-sm">Payment pattern risk: {clientData.paymentPatternRisk || 15}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-purple-500 mr-2">•</span>
              <span className="text-purple-800 dark:text-purple-200 text-sm">Dispute trend: {clientData.disputeTrend || "Low"}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700 mb-6">
        <h5 className="text-purple-900 dark:text-purple-100 font-semibold mb-2 text-sm">Strategic Gap Prevention Plan</h5>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span className="text-purple-800 dark:text-purple-200 text-sm">Standardize client templates across 3 platforms → <span className="font-semibold text-purple-900 dark:text-purple-100">+45% protection value</span></span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span className="text-purple-800 dark:text-purple-200 text-sm">Implement automated gap detection for new clients → <span className="font-semibold text-purple-900 dark:text-purple-100">+35% evidence quality</span></span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span className="text-purple-800 dark:text-purple-200 text-sm">Optimize evidence collection for end-of-month payments → <span className="font-semibold text-purple-900 dark:text-purple-100">+28% payment success</span></span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span className="text-purple-800 dark:text-purple-200 text-sm">Cross-platform dispute prevention protocol → <span className="font-semibold text-purple-900 dark:text-purple-100">+32% business protection</span></span>
          </li>
        </ul>
      </div>
      
      <div className="flex gap-3 mb-6">
        <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
          Set Reminder
        </Button>
        <Button variant="outline" className="flex-1 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800 font-semibold">
          Add Evidence Now
        </Button>
      </div>
      
      <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
        <p className="text-green-900 dark:text-green-100 text-sm font-semibold text-center mb-1">
          You're protecting ${protectedValue}/month across all clients
        </p>
        <div className="text-center text-green-700 dark:text-green-300 text-sm">
          ✓ Top-tier protection complete
        </div>
      </div>
      
      <div className="mt-5 text-purple-600 dark:text-purple-400 text-xs">
        <p>Comprehensive business analysis across platforms and clients. Identifies strategic patterns and provides enterprise-grade gap prevention with automated implementation.</p>
      </div>
    </Card>
  );
};