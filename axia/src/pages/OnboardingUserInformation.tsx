import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, User, DollarSign, Briefcase, GraduationCap, Mail, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@/lib/safe-convex-react';
import { api } from '@/convex/_generated/api';

export default function OnboardingUserInformation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // ponytail: persist step 1 directly to Convex (no localStorage intermediate)
  const saveStep1 = useMutation(api.users.saveOnboardingStep1);
  const [formData, setFormData] = useState({
    fullName: '',
    hourlyRate: '',
    primaryPlatform: '',
    professionalBio: '',
    yearsExperience: ''
  });

  // ponytail: prefill from the user record (name already collected at signup)
  useEffect(() => {
    if (user?.name && !formData.fullName) {
      setFormData((prev) => ({ ...prev, fullName: user.name }));
    }
    if (typeof user?.hourlyRate === 'number' && !formData.hourlyRate) {
      setFormData((prev) => ({ ...prev, hourlyRate: String(user.hourlyRate) }));
    }
    if (user?.primaryPlatform && !formData.primaryPlatform) {
      setFormData((prev) => ({ ...prev, primaryPlatform: user.primaryPlatform }));
    }
    if (user?.professionalBio && !formData.professionalBio) {
      setFormData((prev) => ({ ...prev, professionalBio: user.professionalBio }));
    }
    if (user?.yearsExperience && !formData.yearsExperience) {
      setFormData((prev) => ({ ...prev, yearsExperience: user.yearsExperience }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  const [errors, setErrors] = useState({
    fullName: '',
    hourlyRate: '',
    primaryPlatform: ''
  });

  // Use global theme from ThemeProvider
  const { theme, setTheme } = useTheme();
  
  const platforms = [
    'Upwork', 'Fiverr', 'Toptal', 'Freelancer.com', 
    'PeoplePerHour', 'Guru', 'LinkedIn ProFinder', 'Other'
  ];
  
  const validateForm = () => {
    const newErrors = { fullName: '', hourlyRate: '', primaryPlatform: '' };
    let isValid = true;
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }
    
    if (!formData.hourlyRate || isNaN(Number(formData.hourlyRate)) || Number(formData.hourlyRate) <= 0) {
      newErrors.hourlyRate = 'Valid hourly rate is required';
      isValid = false;
    }
    
    if (!formData.primaryPlatform) {
      newErrors.primaryPlatform = 'Please select your primary platform';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleContinue = async () => {
    if (!validateForm()) return;
    try {
      await saveStep1({
        fullName: formData.fullName,
        hourlyRate: Number(formData.hourlyRate),
        primaryPlatform: formData.primaryPlatform,
        yearsExperience: formData.yearsExperience || undefined,
        professionalBio: formData.professionalBio || undefined,
      } as any);
      navigate('/onboarding-source');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save. Please try again.');
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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

      <Card className="w-full max-w-2xl border border-border shadow-none rounded-2xl bg-card">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <img
              src="./logo.svg"
              alt="Axia Logo"
              width={56}
              height={56}
              className="rounded-lg mb-3 mt-1 cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-2xl">Your Professional Profile</CardTitle>
          </div>
          <CardDescription className="max-w-[420px] mx-auto">
            Let's set up your profile so Axia can accurately protect your earnings
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Smith"
                className={`h-11 bg-background border-border ${errors.fullName ? 'border-destructive' : ''}`}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
              <p className="text-sm text-muted-foreground">
                We'll use this to personalize your protection reports
              </p>
            </div>
            
            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label htmlFor="hourlyRate" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Hourly Rate (USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  placeholder="50"
                  className={`h-11 pl-8 bg-background border-border ${errors.hourlyRate ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.hourlyRate && (
                <p className="text-sm text-destructive">{errors.hourlyRate}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Critical for calculating your potential income loss and protection value
              </p>
            </div>
            
            {/* Primary Platform */}
            <div className="space-y-2">
              <Label htmlFor="primaryPlatform" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Primary Platform
              </Label>
              <select
                id="primaryPlatform"
                name="primaryPlatform"
                value={formData.primaryPlatform}
                onChange={handleChange}
                className={`w-full h-11 px-3 border rounded-md bg-background border-border ${
                  errors.primaryPlatform ? 'border-destructive' : 'border-border'
                }`}
              >
                <option value="">Select your primary platform</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform.toLowerCase()}>
                    {platform}
                  </option>
                ))}
              </select>
              {errors.primaryPlatform && (
                <p className="text-sm text-destructive">{errors.primaryPlatform}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Axia will prioritize protection standards for this platform
              </p>
            </div>
            
            {/* Years of Experience */}
            <div className="space-y-2">
              <Label htmlFor="yearsExperience" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Years of Professional Experience
              </Label>
              <select
                id="yearsExperience"
                name="yearsExperience"
                value={formData.yearsExperience}
                onChange={handleChange}
                className="w-full h-11 px-3 border rounded-md bg-background border-border"
              >
                <option value="">Select experience level</option>
                <option value="1">Less than 1 year</option>
                <option value="2">1-2 years</option>
                <option value="3">2-5 years</option>
                <option value="4">5-10 years</option>
                <option value="5">10+ years</option>
              </select>
              <p className="text-sm text-muted-foreground">
                Helps Axia tailor protection recommendations to your experience level
              </p>
            </div>
            
            {/* Professional Bio */}
            <div className="space-y-2">
              <Label htmlFor="professionalBio" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Professional Bio (Optional)
              </Label>
              <Textarea
                id="professionalBio"
                name="professionalBio"
                value={formData.professionalBio}
                onChange={handleChange}
                placeholder="I'm a web developer specializing in React and Node.js with 5+ years of experience..."
                rows={4}
                className="bg-background border-border"
              />
              <p className="text-sm text-muted-foreground">
                Optional but helpful for context in dispute resolution reports
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              Step 1 of 2
            </div>
            <Button onClick={handleContinue} className="px-6 h-11 bg-axia-teal-600 hover:bg-axia-teal-600/90 text-white">
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>

        {/* Footer — matches Auth.tsx */}
        <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-background border-t border-border rounded-b-lg">
          Secured by{" "}
          <a href="https://better-auth.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            Better Auth
          </a>{" "}
          · Powered by{" "}
          <a href="https://convex.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            Convex
          </a>
        </div>
      </Card>
    </div>
  );
}