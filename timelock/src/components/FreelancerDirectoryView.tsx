import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Star, Clock, Search } from "lucide-react";
import { useState } from "react";

// Mock data — the backend function "clients/freelancerDirectory:getVerifiedFreelancers"
// does not exist yet, so we use local mock data instead of a crashing useQuery call.
const MOCK_FREELANCERS = [
  {
    _id: "fl_1",
    displayName: "Sarah Chen",
    professionalTitle: "Full-Stack Developer",
    bio: "Specialized in React, Node.js, and cloud architecture with 8+ years of experience.",
    skills: ["React", "Node.js", "AWS", "TypeScript", "PostgreSQL"],
    axiaVerified: true,
    verificationScore: 95,
    totalVerifiedHours: 2400,
    hourlyRate: 85,
    availability: "available",
  },
  {
    _id: "fl_2",
    displayName: "Marcus Rivera",
    professionalTitle: "UI/UX Designer",
    bio: "Award-winning designer focused on SaaS products and design systems.",
    skills: ["Figma", "Design Systems", "User Research", "Prototyping"],
    axiaVerified: true,
    verificationScore: 88,
    totalVerifiedHours: 1800,
    hourlyRate: 75,
    availability: "available",
  },
  {
    _id: "fl_3",
    displayName: "Priya Patel",
    professionalTitle: "Data Scientist",
    bio: "Machine learning specialist with a focus on NLP and computer vision applications.",
    skills: ["Python", "TensorFlow", "NLP", "Data Analysis", "SQL"],
    axiaVerified: false,
    verificationScore: 72,
    totalVerifiedHours: 950,
    hourlyRate: 95,
    availability: "busy",
  },
  {
    _id: "fl_4",
    displayName: "Alex Thompson",
    professionalTitle: "DevOps Engineer",
    bio: "Infrastructure automation expert helping teams ship faster and more reliably.",
    skills: ["Docker", "Kubernetes", "CI/CD", "Terraform", "AWS"],
    axiaVerified: true,
    verificationScore: 91,
    totalVerifiedHours: 2100,
    hourlyRate: 90,
    availability: "available",
  },
];

export function FreelancerDirectoryView() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFreelancers = MOCK_FREELANCERS.filter((f) =>
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.professionalTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredFreelancers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              {searchQuery ? "No freelancers match your search." : "No verified freelancers available yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFreelancers.map((freelancer) => (
            <Card key={freelancer._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{freelancer.displayName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{freelancer.professionalTitle}</p>
                  </div>
                  {freelancer.axiaVerified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{freelancer.bio}</p>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{freelancer.verificationScore}/100</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>{freelancer.totalVerifiedHours}h verified</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {freelancer.skills.slice(0, 5).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold">${freelancer.hourlyRate}/hr</span>
                  <Badge variant={
                    freelancer.availability === "available" ? "default" :
                    freelancer.availability === "busy" ? "secondary" : "outline"
                  }>
                    {freelancer.availability}
                  </Badge>
                </div>

                <Button className="w-full" size="sm">
                  Request Verification
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
