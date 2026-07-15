import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@/lib/safe-convex-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface VerificationRequestSystemProps {
  clientId: Id<"clientCompanies">;
}

export function VerificationRequestSystem({ clientId }: VerificationRequestSystemProps) {
  const [freelancerEmail, setFreelancerEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const createRequest = useMutation("clients/verificationRequests:createVerificationRequest" as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (!freelancerEmail || !projectName || !projectDescription) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      // For now, use a placeholder freelancer ID since we don't have email lookup
      // In production, you'd look up the freelancer by email first
      const placeholderFreelancerId = "jx7a2ngnp07n3yxxtxqfsaw95h7trnc9";
      
      await createRequest({
        clientId,
        freelancerUserId: placeholderFreelancerId,
        projectName,
        projectDescription,
        workPeriodStart: startDate.getTime(),
        workPeriodEnd: endDate.getTime(),
      });
      
      toast.success("Verification request created successfully");
      
      // Reset form
      setFreelancerEmail("");
      setProjectName("");
      setProjectDescription("");
      setStartDate(undefined);
      setEndDate(undefined);
    } catch (error: any) {
      toast.error(error.message || "Failed to create verification request");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Verification Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="freelancerEmail">Freelancer Email</Label>
            <Input
              id="freelancerEmail"
              type="email"
              placeholder="freelancer@example.com"
              value={freelancerEmail}
              onChange={(e) => setFreelancerEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              placeholder="Website Redesign"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="projectDescription">Project Description</Label>
            <Textarea
              id="projectDescription"
              placeholder="Describe the work that needs verification..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Work Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Work Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Send Verification Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}