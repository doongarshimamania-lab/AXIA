import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowRight, Search, Users, Newspaper, Radio, Tv, ShoppingBag,
         GraduationCap, BookOpen, Coffee, Globe, Building, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function OnboardingSource() {
  const navigate = useNavigate();
  const completeOnboarding = async (_args: any) => {
    return;
  };
  const [selectedSource, setSelectedSource] = useState('');
  const [referrer, setReferrer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add: Theme state and persistence
  const [theme, setTheme] = useState<"light" | "dark">(
    ((typeof localStorage !== "undefined" && localStorage.getItem("timelock_theme")) as "light" | "dark") || "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("timelock_theme", theme);
    } catch {}
  }, [theme]);
  
  const sources = [
    {
      id: 'search_engine',
      label: 'Search Engine',
      icon: Search,
      description: 'Google, Bing, etc.',
      detailPrompt: "Which search engine? (Optional)"
    },
    {
      id: 'social_media',
      label: 'Social Media',
      icon: Users,
      description: 'Facebook, LinkedIn, Twitter',
      detailPrompt: "Which platform? (Optional)"
    },
    {
      id: 'blog_article',
      label: 'Blog Article',
      icon: Newspaper,
      description: 'Tech blogs, publications',
      detailPrompt: "Which blog or website? (Optional)"
    },
    {
      id: 'podcast',
      label: 'Podcast',
      icon: Radio,
      description: 'Freelance podcasts',
      detailPrompt: "Which podcast? (Optional)"
    },
    {
      id: 'youtube',
      label: 'YouTube',
      icon: Tv,
      description: 'Video tutorials',
      detailPrompt: "Which channel or video? (Optional)"
    },
    {
      id: 'paid_ad',
      label: 'Paid Ad',
      icon: ShoppingBag,
      description: 'Google Ads, social ads',
      detailPrompt: "Where did you see the ad? (Optional)"
    },
    {
      id: 'friend_referral',
      label: 'Friend Referral',
      icon: Users,
      description: 'Recommended by friend',
      detailPrompt: "Who referred you? (Optional)"
    },
    {
      id: 'colleague',
      label: 'Colleague',
      icon: Building,
      description: 'Work recommendation',
      detailPrompt: "Where do you work together? (Optional)"
    },
    {
      id: 'freelance_community',
      label: 'Community',
      icon: GraduationCap,
      description: 'Forums, Slack, Discord',
      detailPrompt: "Which community? (Optional)"
    },
    {
      id: 'course_training',
      label: 'Course/Training',
      icon: BookOpen,
      description: 'Online courses',
      detailPrompt: "Which course? (Optional)"
    },
    {
      id: 'conference_event',
      label: 'Conference',
      icon: Coffee,
      description: 'Industry events',
      detailPrompt: "Which event? (Optional)"
    },
    {
      id: 'other',
      label: 'Other',
      icon: Globe,
      description: 'Something else',
      detailPrompt: "Please specify (Required)"
    }
  ];
  
  const handleSourceSelect = (sourceId: string) => {
    setSelectedSource(sourceId);
    if (sourceId !== 'friend_referral' && sourceId !== 'other') {
      setReferrer('');
    }
  };
  
  const handleContinue = async () => {
    if (selectedSource === 'other' && !referrer.trim()) {
      toast.error('Please specify how you heard about us');
      return;
    }
    
    const onboardingDataStr = localStorage.getItem('onboardingData');
    if (!onboardingDataStr) {
      toast.error('Onboarding data not found. Please start over.');
      navigate('/onboarding-user-information');
      return;
    }
    
    const onboardingData = JSON.parse(onboardingDataStr);
    
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        fullName: onboardingData.fullName,
        hourlyRate: Number(onboardingData.hourlyRate),
        primaryPlatform: onboardingData.primaryPlatform,
        yearsExperience: onboardingData.yearsExperience || undefined,
        professionalBio: onboardingData.professionalBio || undefined,
        acquisitionSource: selectedSource,
        acquisitionSourceDetail: referrer || undefined
      });
      
      localStorage.removeItem('onboardingData');
      toast.success('Welcome to TIMELock!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex items-center justify-center p-4">
      {/* Dark mode toggle - fixed position */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2 shadow-sm">
        <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
          aria-label="Toggle dark mode"
        />
        <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
      </div>

      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-2xl">How Did You Find Us?</CardTitle>
          </div>
          <CardDescription>
            Help us understand how freelancers discover TIMELock so we can better serve you
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* 4x3 Grid Layout - 4 columns, wider cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {sources.map((source) => {
              const Icon = source.icon;
              const isSelected = selectedSource === source.id;
              
              return (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source.id)}
                  className={`p-3 rounded-lg border transition-all text-left min-h-[100px] ${
                    isSelected 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-1.5 h-full justify-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-xs">{source.label}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{source.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Conditional input for friend_referral or other */}
          {selectedSource && (selectedSource === 'friend_referral' || selectedSource === 'other') && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
              <label className="text-sm font-medium mb-2 block">
                {selectedSource === 'friend_referral' ? "Friend's name or email" : "Please specify"}
              </label>
              <Input
                type="text"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                placeholder={
                  selectedSource === 'friend_referral' 
                    ? "Friend's name or email" 
                    : sources.find(s => s.id === selectedSource)?.detailPrompt || "Please specify"
                }
                className="w-full"
              />
              {selectedSource === 'friend_referral' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Helps us recognize and reward our advocates
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <Button 
              variant="outline"
              onClick={() => navigate('/onboarding-user-information')}
              className="px-4"
              disabled={isSubmitting}
            >
              Back
            </Button>
            
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              Step 2 of 2
            </div>
            
            <Button 
              onClick={handleContinue}
              disabled={!selectedSource || isSubmitting}
              className="px-6"
            >
              {isSubmitting ? 'Completing...' : 'Complete Setup'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}