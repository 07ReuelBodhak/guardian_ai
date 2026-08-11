"use client";

import { useState, useEffect } from "react";
import { Activity, Zap, Shield, HeartPulse, Flame, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type SessionLog = {
  id: string;
  userId: string;
  overallMood: string;
  summary: string;
  createdAt: string;
};

// Map moods to scores
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

const getScoresForMood = (mood: string) => {
  const normalized = mood.toLowerCase().replace(/[^a-z_]/g, "");
  return MOOD_SCORES[normalized] || MOOD_SCORES.neutral;
};

export default function MoodPage() {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [baseline, setBaseline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/mood");
        if (res.ok) {
          const data = await res.json();
          setSessionLogs(data.sessionLogs || []);
          setBaseline(data.baseline || null);
        }
      } catch (error) {
        console.error("Failed to fetch mood data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (sessionLogs.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Mood & Wellbeing</h1>
          <p className="text-slate-500">Track your emotional state and energy levels over time.</p>
        </div>
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <HeartPulse className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Mood Data Yet</h3>
          <p className="text-slate-500 max-w-md mt-2">
            Start chatting with Guardian on Discord! After your first conversation (with 15+ minutes of silence afterwards), Guardian will analyze your session and plot your mood here.
          </p>
        </Card>
      </div>
    );
  }

  // Transform data for Weekly Trends (use last 7-10 sessions)
  const recentLogs = sessionLogs.slice(-10);
  const weeklyData = recentLogs.map((log) => {
    const scores = getScoresForMood(log.overallMood);
    return {
      day: new Date(log.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      ...scores,
    };
  });

  // Calculate moving burnout risk (higher stress + lower motivation = higher risk)
  let accumulatedRisk = 20; // base risk
  const burnoutData = sessionLogs.map((log, i) => {
    const scores = getScoresForMood(log.overallMood);
    
    // Increase risk if stressed and unmotivated
    if (scores.stress > 70 && scores.motivation < 40) {
      accumulatedRisk = Math.min(100, accumulatedRisk + 15);
    } 
    // Decrease risk if happy and motivated
    else if (scores.stress < 40 && scores.motivation > 70) {
      accumulatedRisk = Math.max(0, accumulatedRisk - 15);
    }
    // Slowly decay to baseline 20 otherwise
    else {
      accumulatedRisk = accumulatedRisk > 20 ? accumulatedRisk - 5 : (accumulatedRisk < 20 ? accumulatedRisk + 5 : 20);
    }
    
    return {
      week: `S${i + 1}`,
      risk: accumulatedRisk
    };
  });

  // Calculate Averages for the stat cards based on recent sessions
  const latestScores = getScoresForMood(sessionLogs[sessionLogs.length - 1].overallMood);
  const avgMotivation = Math.round(weeklyData.reduce((acc, val) => acc + val.motivation, 0) / weeklyData.length);
  const avgConfidence = Math.round(weeklyData.reduce((acc, val) => acc + val.confidence, 0) / weeklyData.length);
  const avgStress = Math.round(weeklyData.reduce((acc, val) => acc + val.stress, 0) / weeklyData.length);
  const energyLevel = avgMotivation > 70 ? "High" : avgMotivation < 40 ? "Low" : "Medium";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Mood & Wellbeing</h1>
        <p className="text-slate-500">Track your emotional state and energy levels over time.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Avg Motivation", value: `${avgMotivation}%`, icon: <Zap className="w-4 h-4 text-amber-500" /> },
          { title: "Avg Confidence", value: `${avgConfidence}%`, icon: <Shield className="w-4 h-4 text-emerald-500" /> },
          { title: "Avg Stress", value: `${avgStress}%`, icon: <Activity className="w-4 h-4 text-rose-500" /> },
          { title: "Energy Levels", value: energyLevel, icon: <HeartPulse className="w-4 h-4 text-indigo-500" /> },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">Based on recent sessions</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Session Trends</CardTitle>
            <CardDescription>Confidence vs Stress vs Motivation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="motivation" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Burnout Risk Over Time</CardTitle>
            <CardDescription>Guardian&apos;s analysis of your emotional fatigue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burnoutData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-indigo-500" />
              Guardian Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessionLogs.slice(-2).reverse().map((log) => {
                const isPositive = ["happy", "content", "motivated"].includes(log.overallMood.toLowerCase());
                return (
                  <div key={log.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex gap-4">
                    <div className={`w-1.5 rounded-full shrink-0 ${isPositive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1 capitalize">
                        Latest Session: {log.overallMood}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{log.summary}</p>
                      <p className="text-xs text-slate-400 mt-2">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
              
              {baseline && (
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex gap-4">
                  <div className="w-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">Texting Baseline Profile</h4>
                    <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80">
                      I've noticed your usual typing style is <b>{baseline.typingStyle || 'mixed'}</b> with an average message length of <b>{Math.round(baseline.averageLength || 0)}</b> chars. 
                      Your top words are: <i>{(baseline.topWords || []).join(", ")}</i>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
