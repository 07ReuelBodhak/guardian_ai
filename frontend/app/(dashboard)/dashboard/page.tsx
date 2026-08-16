import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, CheckCircle2, Clock, ShieldAlert, Sparkles, TrendingUp, CalendarX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function DashboardOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  // Fetch today's tasks
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Filter tasks for today in memory to avoid SQLite Date string format mismatches
  const allTasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      status: 'pending'
    },
    orderBy: { dueDate: 'asc' }
  });

  const tasks = allTasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate >= startOfDay && taskDate <= endOfDay;
  });

  // Fetch latest session log (memory)
  const latestLog = await prisma.sessionLog.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(date);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }
    return Math.floor(seconds) + " seconds ago";
  };

  const MOOD_SCORES: Record<string, { confidence: number; stress: number; motivation: number }> = {
    happy: { confidence: 85, stress: 20, motivation: 85 },
    content: { confidence: 75, stress: 30, motivation: 70 },
    motivated: { confidence: 90, stress: 40, motivation: 95 },
    neutral: { confidence: 60, stress: 50, motivation: 60 },
    anxious: { confidence: 40, stress: 80, motivation: 50 },
    stressed: { confidence: 50, stress: 85, motivation: 45 },
    frustrated: { confidence: 45, stress: 75, motivation: 40 },
    sad: { confidence: 30, stress: 60, motivation: 30 },
    burnt_out: { confidence: 20, stress: 90, motivation: 15 },
  };

  const normalizedMood = latestLog?.overallMood?.toLowerCase().replace(/[^a-z_]/g, "") || "neutral";
  const latestScores = latestLog ? (MOOD_SCORES[normalizedMood] || MOOD_SCORES.neutral) : { confidence: 0, stress: 0, motivation: 0 };

  const firstHabit = await prisma.scheduledHabit.findFirst({
    where: { userId: session.user.id },
    orderBy: { time: 'asc' }
  });

  const sessionLogs = await prisma.sessionLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' }
  });

  let burnoutRisk = 0;
  if (sessionLogs.length > 0) {
    burnoutRisk = 20;
    sessionLogs.forEach(log => {
      const normalized = log.overallMood?.toLowerCase().replace(/[^a-z_]/g, "") || "neutral";
      const scores = MOOD_SCORES[normalized] || MOOD_SCORES.neutral;
      if (scores.stress > 70 && scores.motivation < 40) burnoutRisk = Math.min(100, burnoutRisk + 15);
      else if (scores.stress < 40 && scores.motivation > 70) burnoutRisk = Math.max(0, burnoutRisk - 15);
      else burnoutRisk = burnoutRisk > 20 ? burnoutRisk - 5 : (burnoutRisk < 20 ? burnoutRisk + 5 : 20);
    });
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(" ")[0] || "User"}</h1>
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
            <p className="text-xs text-[#64748B] mt-1">Monitoring channels</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Current Mood</CardTitle>
            <Activity className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{latestLog ? latestLog.overallMood : "Unknown"}</div>
            <p className="text-xs text-[#64748B] mt-1">
              {latestLog ? "Based on recent interactions" : "No recent interactions"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Daily Routine</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {firstHabit ? (
              <>
                <div className="text-2xl font-bold mt-1">{firstHabit.time}</div>
                <p className="text-xs text-[#64748B] mt-1 capitalize">{firstHabit.title}</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-400 text-lg mt-1">No data</div>
                <p className="text-xs text-[#64748B] mt-1">Schedule a habit to begin</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <ShieldAlert className={`w-4 h-4 ${sessionLogs.length > 0 ? (burnoutRisk > 60 ? 'text-rose-500' : 'text-emerald-500') : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            {sessionLogs.length > 0 ? (
              <>
                <div className={`text-2xl font-bold mt-1 ${burnoutRisk > 60 ? 'text-rose-500' : 'text-emerald-500'}`}>{burnoutRisk}%</div>
                <p className="text-xs text-[#64748B] mt-1">Current Burnout Risk</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-400 text-lg mt-1">Pending</div>
                <p className="text-xs text-[#64748B] mt-1">Requires more conversations</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today&apos;s Focus</CardTitle>
              <CardDescription>Tasks scheduled for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                      <CalendarX className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks for today!</p>
                    <p className="text-xs text-slate-500 mt-1">Enjoy your free time, or ask your Guardian to schedule some goals.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {task.completed && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${task.completed ? "line-through text-slate-500" : ""}`}>
                          {task.title}
                        </div>
                      </div>
                      {task.dueDate && (
                        <div className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                          {formatTime(task.dueDate)}
                        </div>
                      )}
                    </div>
                  ))
                )}
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
                <div className="flex justify-between text-xs mb-1.5 opacity-50">
                  <span className="font-medium">Motivation</span>
                  <span className="text-[#64748B]">{latestScores.motivation}%</span>
                </div>
                <Progress value={latestScores.motivation} className="h-1.5 bg-slate-100 dark:bg-[#1E293B]" indicatorColor="bg-[#4F46E5]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1.5 opacity-50">
                  <span className="font-medium">Confidence</span>
                  <span className="text-[#64748B]">{latestScores.confidence}%</span>
                </div>
                <Progress value={latestScores.confidence} className="h-1.5 bg-slate-100 dark:bg-[#1E293B]" indicatorColor="bg-[#8B5CF6]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1.5 opacity-50">
                  <span className="font-medium">Stress</span>
                  <span className="text-[#64748B]">{latestScores.stress}%</span>
                </div>
                <Progress value={latestScores.stress} className="h-1.5 bg-slate-100 dark:bg-[#1E293B]" indicatorColor="bg-[#10B981]" />
              </div>
            </CardContent>
          </Card>

          {/* Latest Memory */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Latest Memory</CardTitle>
                {latestLog && (
                  <Badge variant="outline" className="text-xs font-normal">{getTimeAgo(latestLog.createdAt)}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {latestLog ? (
                <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-100 dark:border-[#1E293B] relative">
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="ml-14">
                    <p className="text-sm font-medium">
                      &quot;{latestLog.summary}&quot;
                    </p>
                    <p className="text-[10px] text-[#4F46E5] mt-2 capitalize">Mood: {latestLog.overallMood}</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-dashed border-slate-200 dark:border-[#1E293B]">
                  <p className="text-sm text-slate-500">No memories recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
