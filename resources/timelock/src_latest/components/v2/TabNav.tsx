import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  icon?: React.ElementType;
}

interface TabNavProps {
  tabs: TabItem[];
  defaultValue?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}

export function TabNav({ tabs, defaultValue, className, onValueChange }: TabNavProps) {
  const defaultTab = defaultValue || tabs[0]?.value;
  return (
    <Tabs defaultValue={defaultTab} className={className} onValueChange={onValueChange}>
      <TabsList className="bg-muted">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
