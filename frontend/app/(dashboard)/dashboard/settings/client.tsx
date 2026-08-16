"use client";

import { useState } from "react";
import { Bell, User, Lock, Save, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateUserSettings } from "@/app/actions/user";
import { toast } from "sonner";

// Define the shape of the user prop we receive from the server
interface UserData {
  name: string | null;
  email: string | null;
  timezone: string | null;
  motivation: string | null;
  dailySummary: boolean;
  goalReminders: boolean;
  proactiveCheckins: boolean;
  autoMonthlyReport: boolean;
  emergencyEscalation: boolean;
}

export default function SettingsClient({ user }: { user: UserData }) {
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState(user.name || "");
  const [timezone, setTimezone] = useState(user.timezone || "utc");
  const [motivation, setMotivation] = useState(user.motivation || "logical");
  
  const [dailySummary, setDailySummary] = useState(user.dailySummary ?? true);
  const [goalReminders, setGoalReminders] = useState(user.goalReminders ?? true);
  const [proactiveCheckins, setProactiveCheckins] = useState(user.proactiveCheckins ?? true);
  const [autoMonthlyReport, setAutoMonthlyReport] = useState(user.autoMonthlyReport ?? true);
  const [emergencyEscalation, setEmergencyEscalation] = useState(user.emergencyEscalation ?? false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserSettings({ name, timezone });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    }
    setIsSaving(false);
  };

  const handleSavePreferences = async (updates: any) => {
    try {
      await updateUserSettings(updates);
      toast.success("Preferences updated successfully");
    } catch (error) {
      toast.error("Failed to update preferences");
    }
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
        <TabsTrigger value="profile" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Profile</TabsTrigger>
        <TabsTrigger value="preferences" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Preferences</TabsTrigger>
        <TabsTrigger value="guardian" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Guardian AI</TabsTrigger>
        <TabsTrigger value="data" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Data & Privacy</TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your basic details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email || ""} disabled />
              <p className="text-xs text-slate-500">Email cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={(val) => setTimezone(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                  <SelectItem value="utc">Coordinated Universal Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Control how and when you are notified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Daily Summary</Label>
                <p className="text-sm text-slate-500">Receive a morning briefing of your day.</p>
              </div>
              <Switch 
                checked={dailySummary} 
                onCheckedChange={(val) => {
                  setDailySummary(val);
                  handleSavePreferences({ dailySummary: val });
                }} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Goal Reminders</Label>
                <p className="text-sm text-slate-500">Notifications when you are falling behind.</p>
              </div>
              <Switch 
                checked={goalReminders} 
                onCheckedChange={(val) => {
                  setGoalReminders(val);
                  handleSavePreferences({ goalReminders: val });
                }} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Proactive Check-ins</Label>
                <p className="text-sm text-slate-500">Allow Guardian to reach out when it detects stress.</p>
              </div>
              <Switch 
                checked={proactiveCheckins} 
                onCheckedChange={(val) => {
                  setProactiveCheckins(val);
                  handleSavePreferences({ proactiveCheckins: val });
                }} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-send Monthly Report</Label>
                <p className="text-sm text-slate-500">Automatically generate and email your AI performance report each month.</p>
              </div>
              <Switch 
                checked={autoMonthlyReport} 
                onCheckedChange={(val) => {
                  setAutoMonthlyReport(val);
                  handleSavePreferences({ autoMonthlyReport: val });
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="guardian">
        <Card>
          <CardHeader>
            <CardTitle>Guardian Personality</CardTitle>
            <CardDescription>Adjust how Guardian interacts with you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="style">Motivation Style</Label>
              <Select 
                value={motivation} 
                onValueChange={(val) => {
                  setMotivation(val);
                  handleSavePreferences({ motivation: val });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logical">Logical & Direct</SelectItem>
                  <SelectItem value="friendly">Supportive Friend</SelectItem>
                  <SelectItem value="stoic">Stoic Philosopher</SelectItem>
                  <SelectItem value="coach">Strict Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-base text-rose-600 dark:text-rose-500">Emergency Escalation</Label>
                <p className="text-sm text-slate-500">Allow Guardian to contact trusted people in crisis.</p>
              </div>
              <Switch 
                checked={emergencyEscalation} 
                onCheckedChange={(val) => {
                  setEmergencyEscalation(val);
                  handleSavePreferences({ emergencyEscalation: val });
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export or delete your data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1" onClick={() => toast("Exporting data...")}>
                <Download className="w-4 h-4 mr-2" /> Export My Data
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => toast.error("Are you sure? This cannot be undone.")}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Account
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Deleting your account will permanently erase your memory graph and all associated data.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

