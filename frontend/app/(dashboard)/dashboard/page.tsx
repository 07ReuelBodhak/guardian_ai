"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, CheckCircle2, Clock, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Welcome back, John</h1>
        <p className="text-[#64748B]">Your Guardian is active and protecting your routines.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Guardian Status</CardTitle>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-[#64748B] mt-1">Monitoring 3 platforms</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Current Mood</CardTitle>
            <Activity className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Focused</div>
            <p className="text-xs text-[#64748B] mt-1">Based on recent Telegram chats</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Daily Routine</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">On Track</div>
            <p className="text-xs text-[#64748B] mt-1">Next: Study Session in 30m</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Low <span className="text-sm font-normal text-[#64748B] ml-1">(12%)</span></div>
            <p className="text-xs text-[#64748B] mt-1">Burnout risk is minimal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Summary */}
          <Card className="bg-[#4F46E5] border-none p-6 rounded-2xl shadow-xl shadow-indigo-500/20">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <CardTitle className="font-bold text-white text-base">Daily Recommendation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                Good morning! You&apos;ve been maintaining a strong study habit for the past 4 days. Your stress levels are currently low, but I noticed you mentioned being tired in a Discord message last night. Let&apos;s make sure you get to bed by 11 PM tonight. Your main focus today is the AI Engineer prep material.
              </p>
              <button className="w-full py-2 bg-white text-[#4F46E5] text-xs font-bold rounded-lg">Acknowledge</button>
            </CardContent>
          </Card>

          {/* Today&apos;s Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today&apos;s Focus</CardTitle>
              <CardDescription>Generated based on your goals and routine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { text: "Complete Neural Networks Chapter 4", time: "10:00 AM", status: "completed" },
                  { text: "Submit Project Proposal", time: "2:00 PM", status: "pending" },
                  { text: "Evening Workout (30m)", time: "6:30 PM", status: "pending" },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {task.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${task.status === "completed" ? "line-through text-slate-500" : ""}`}>
                        {task.text}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      {task.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Mental State */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">Motivation</span>
                  <span className="text-[#64748B]">85%</span>
                </div>
                <Progress value={85} className="h-1.5 bg-slate-100 dark:bg-[#1E293B]" indicatorColor="bg-[#4F46E5]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">Confidence</span>
                  <span className="text-[#64748B]">72%</span>
                </div>
                <Progress value={72} className="h-1.5 bg-slate-100 dark:bg-[#1E293B]" indicatorColor="bg-[#8B5CF6]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">Stress</span>
                  <span className="text-[#64748B]">30%</span>
                </div>
                <Progress value={30} className="h-1.5 bg-slate-100 dark:bg-[#1E293B]" indicatorColor="bg-[#10B981]" />
              </div>
            </CardContent>
          </Card>

          {/* Latest Memory */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Latest Memory</CardTitle>
                <Badge variant="outline" className="text-xs font-normal">2 hours ago</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#1E293B] relative">
                <div className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="ml-14">
                  <p className="text-sm font-medium">
                    &quot;I&apos;m feeling a bit anxious about the upcoming interview tomorrow morning.&quot;
                  </p>
                  <p className="text-[10px] text-[#4F46E5] mt-2">Captured from WhatsApp • 2h ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
