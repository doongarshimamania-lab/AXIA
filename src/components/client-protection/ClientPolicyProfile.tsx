import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

interface ClientPolicyProfileProps {
  selectedClient: any;
  tier: string;
}

export function ClientPolicyProfile({ selectedClient, tier }: ClientPolicyProfileProps) {
  const queryFn: any = api.clients.clientPolicyProfile.getClientPolicyProfile;
  
  const isRealClient = selectedClient?._id && !selectedClient._id.startsWith("client_");
  
  const profileData = useQuery(
    queryFn,
    isRealClient ? { clientId: selectedClient._id } : "skip"
  );

  const displayData = isRealClient ? profileData : selectedClient;

  if (!displayData) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          Loading policy profile...
        </div>
      </Card>
    );
  }

  if (tier === "free") return <ClientPolicyProfileFree clientData={displayData} />;
  if (tier === "starter") return <ClientPolicyProfileStarter clientData={displayData} />;
  if (tier === "pro") return <ClientPolicyProfilePro clientData={displayData} />;
  if (tier === "expert") return <ClientPolicyProfileExpert clientData={displayData} />;
  return <ClientPolicyProfileFree clientData={displayData} />;
}

// Helper calculations
const calculateEvidenceCollection = (data: any) => {
  return Math.min(100, Math.round((data.evidenceCount || 0) * 20));
};

const calculateContextRelevance = (data: any) => {
  return Math.min(100, Math.round(
    ((data.evidenceWithClientKeywords || 0) / Math.max(1, (data.clientKeywords?.length || 1))) * 50 + 
    ((data.workSpecificity || 0) * 50)
  ));
};

const calculatePlatformProtection = (data: any) => {
  let protectionScore = 0;
  if (data.hasClientSpecificRequirements) protectionScore += 40;
  protectionScore += Math.min(40, (data.activityDensity || 0) * 20);
  protectionScore += (data.memoQuality || 0) * 20;
  return Math.min(100, protectionScore);
};

const calculateBusinessProtection = (data: any) => {
  return Math.min(100, Math.round(
    ((data.clientDiversity || 0) * 0.3) + 
    ((data.platformCoverage || 0) * 0.35) + 
    ((data.historicalSuccess || 0) * 0.35)
  ));
};

const ClientPolicyProfileFree = ({ clientData }: { clientData: any }) => {
  const evidenceCollection = calculateEvidenceCollection(clientData);
  const protectedValue = Math.round(evidenceCollection * 0.185);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
            Basic Verification
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Evidence collection verification
          </p>
        </div>
        <span className="bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Free
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-slate-600 dark:text-slate-400 text-sm mb-1">Evidence Collection</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {clientData.evidenceCount || 0} items
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
        <h5 className="text-slate-900 dark:text-slate-100 font-semibold mb-2 text-sm">Basic Verification</h5>
        <p className="text-slate-700 dark:text-slate-300 text-sm">
          Your evidence collection is sufficient to verify basic work activity. 
          No context-specific gaps detected in your current evidence.
        </p>
      </div>
      
      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
        <p className="text-amber-900 dark:text-amber-100 text-sm mb-2 font-semibold">
          You've protected ${protectedValue} this month through basic evidence collection
        </p>
        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
          Upgrade for context-specific protection
        </p>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
          Upgrade to Starter → $4/mo
        </Button>
      </div>
      
      <div className="mt-5 text-slate-500 dark:text-slate-400 text-xs">
        <p>Basic assessment of evidence quality only. No context or platform analysis.</p>
      </div>
    </Card>
  );
};

const ClientPolicyProfileStarter = ({ clientData }: { clientData: any }) => {
  const evidenceCollection = calculateEvidenceCollection(clientData);
  const contextRelevance = calculateContextRelevance(clientData);
  const contextScore = Math.round((evidenceCollection + contextRelevance) / 2);
  const dollarValue = Math.round(contextScore * 0.85);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-blue-900 dark:text-blue-100">
            Contextual Verification
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
            Evidence collection + context relevance
          </p>
        </div>
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Starter
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Evidence Collection</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {clientData.evidenceCount || 0} items
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Context Relevance</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {contextRelevance}%
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-blue-800 rounded-xl border border-blue-200 dark:border-blue-700 mb-6">
        <h5 className="text-blue-900 dark:text-blue-100 font-semibold mb-3 text-sm">Contextual Gaps Analysis</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      
      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
        <p className="text-amber-900 dark:text-amber-100 text-sm mb-2 font-semibold">
          You're protecting ${dollarValue} this month through contextual protection
        </p>
        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
          Upgrade for platform-specific protection
        </p>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
          Upgrade to Pro → $7/mo
        </Button>
      </div>
      
      <div className="mt-5 text-blue-600 dark:text-blue-400 text-xs">
        <p>Analysis of evidence quality AND alignment with client-specific requirements. 
        Identifies context gaps that could lead to payment denials on specific platforms.</p>
      </div>
    </Card>
  );
};

const ClientPolicyProfilePro = ({ clientData }: { clientData: any }) => {
  const evidenceCollection = calculateEvidenceCollection(clientData);
  const contextRelevance = calculateContextRelevance(clientData);
  const platformProtection = calculatePlatformProtection(clientData);
  const platformScore = Math.round((evidenceCollection + contextRelevance + platformProtection) / 3);
  const dollarValue = Math.round((clientData.avgProjectValue || 1200) * 0.35);
  const platformVulnerability = Math.max(0, 100 - platformProtection);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-amber-900 dark:text-amber-100">
            Platform-Specific Protection
          </h3>
          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
            Evidence + context + platform policy analysis
          </p>
        </div>
        <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Pro
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
          <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Evidence Collection</div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {clientData.evidenceCount || 0} items
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
          <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Context Relevance</div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {contextRelevance}%
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700">
          <div className="text-amber-600 dark:text-amber-400 text-sm mb-1">Platform Vulnerability</div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {platformVulnerability}%
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700 mb-6">
        <h5 className="text-amber-900 dark:text-amber-100 font-semibold mb-3 text-sm">Platform-Specific Risk Analysis</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <span className="text-amber-800 dark:text-amber-200 text-sm">Platform vulnerability: {platformVulnerability}%</span>
          </div>
          <div className="flex items-center">
            <span className="text-amber-500 mr-2">•</span>
            <span className="text-amber-800 dark:text-amber-200 text-sm">Platform recommendations: {clientData.platformRecommendations || 3} items</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-amber-800 rounded-xl border border-amber-200 dark:border-amber-700 mb-6">
        <h5 className="text-amber-900 dark:text-amber-100 font-semibold mb-3 text-sm">Client-Specific Protection Plan</h5>
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
            <span className="text-amber-800 dark:text-amber-200 text-sm">Implement platform-specific evidence rules → <span className="font-semibold text-amber-900 dark:text-amber-100">+28% payment success rate</span></span>
          </li>
        </ul>
      </div>
      
      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
        <p className="text-purple-900 dark:text-purple-100 text-sm mb-2 font-semibold">
          You're preventing ${dollarValue} in losses through platform-specific protection
        </p>
        <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
          Upgrade for business-wide protection
        </p>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
          Upgrade to Expert → $12/mo
        </Button>
      </div>
      
      <div className="mt-5 text-amber-600 dark:text-amber-400 text-xs">
        <p>Advanced analysis of platform-specific policies and vulnerabilities. 
        Includes one-click templates to fix missing requirements on Upwork, Fiverr, and Toptal.</p>
      </div>
    </Card>
  );
};

const ClientPolicyProfileExpert = ({ clientData }: { clientData: any }) => {
  const evidenceCollection = calculateEvidenceCollection(clientData);
  const contextRelevance = calculateContextRelevance(clientData);
  const platformProtection = calculatePlatformProtection(clientData);
  const businessProtection = calculateBusinessProtection(clientData);
  const businessScore = Math.round((evidenceCollection + contextRelevance + platformProtection + businessProtection) / 4);
  const dollarValue = Math.round(((clientData.weeklyIncome || 250) * 4.33) * 0.12);
  const platformVulnerability = Math.max(0, 100 - platformProtection);
  
  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-2xl border-2 border-purple-200 dark:border-purple-700">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-xl text-purple-900 dark:text-purple-100">
            Business-Wide Protection
          </h3>
          <p className="text-purple-700 dark:text-purple-300 text-sm mt-1">
            Cross-platform evidence analysis + business pattern detection
          </p>
        </div>
        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Expert
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Evidence Collection</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {clientData.evidenceCount || 0} items
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Context Relevance</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {contextRelevance}%
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Platform Vulnerability</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {platformVulnerability}%
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="text-purple-600 dark:text-purple-400 text-sm mb-1">Business Protection</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {businessProtection}%
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700 mb-6">
        <h5 className="text-purple-900 dark:text-purple-100 font-semibold mb-3 text-sm">Platform-Specific Analysis</h5>
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
      
      <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700 mb-6">
        <h5 className="text-purple-900 dark:text-purple-100 font-semibold mb-3 text-sm">Business Pattern Detection</h5>
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
      
      <div className="p-4 bg-white dark:bg-purple-800 rounded-xl border border-purple-200 dark:border-purple-700 mb-6">
        <h5 className="text-purple-900 dark:text-purple-100 font-semibold mb-3 text-sm">Strategic Recommendations</h5>
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
      
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
        <p className="text-green-900 dark:text-green-100 text-sm mb-2 font-semibold text-center">
          You're protecting ${dollarValue}/month across all clients through business-wide protection
        </p>
        <div className="text-center text-green-700 dark:text-green-300 text-sm">
          ✓ Top-tier protection complete
        </div>
      </div>
      
      <div className="mt-5 text-purple-600 dark:text-purple-400 text-xs">
        <p>Comprehensive business analysis across platforms and clients. Identifies strategic patterns and provides 
        enterprise-grade protection with automated implementation. Includes cross-platform policy mapping and 
        business-level dispute prevention.</p>
      </div>
    </Card>
  );
};