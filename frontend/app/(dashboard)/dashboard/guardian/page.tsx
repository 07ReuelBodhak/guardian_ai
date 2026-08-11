import { Shield, ShieldAlert, ShieldCheck, Heart, AlertTriangle, Phone, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import EmergencyClient from "./emergency-client";

const prisma = new PrismaClient();

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

export default async function GuardianPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { emergencyContact: true }
  });

  const sessionLogs = await prisma.sessionLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' }
  });

  if (!user) {
    redirect("/login");
  }

  // Calculate live risks based on session logs
  let burnoutRisk = 0;
  let isolationRisk = 0;
  let crisisRisk = 0;

  if (sessionLogs.length > 0) {
    burnoutRisk = 20;
    isolationRisk = 15;
    crisisRisk = 2;

    sessionLogs.forEach(log => {
      const scores = getScoresForMood(log.overallMood);
      
      // Burnout Logic
      if (scores.stress > 70 && scores.motivation < 40) burnoutRisk = Math.min(100, burnoutRisk + 15);
      else if (scores.stress < 40 && scores.motivation > 70) burnoutRisk = Math.max(0, burnoutRisk - 15);
      else burnoutRisk = burnoutRisk > 20 ? burnoutRisk - 5 : (burnoutRisk < 20 ? burnoutRisk + 5 : 20);

      // Isolation Logic
      if (["sad", "anxious"].includes(log.overallMood)) isolationRisk = Math.min(100, isolationRisk + 20);
      else isolationRisk = Math.max(5, isolationRisk - 10);

      // Crisis Logic
      if (["burnt_out", "anxious", "sad"].includes(log.overallMood)) crisisRisk = Math.min(100, crisisRisk + 10);
      else crisisRisk = Math.max(1, crisisRisk - 5);
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Guardian Protection</h1>
        <p className="text-slate-500">Proactive mental health support and crisis escalation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="text-emerald-800 dark:text-emerald-400">Protection Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Active & Monitoring</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Guardian is analyzing your conversations for signs of distress, burnout, or isolation.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Guardian Risk Score</CardTitle>
            <CardDescription>Real-time analysis of emotional well-being</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${burnoutRisk > 60 ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Burnout Risk</span>
                  </div>
                  <span className={`text-xl font-bold ${burnoutRisk > 60 ? 'text-rose-500' : 'text-emerald-500'}`}>{burnoutRisk}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${burnoutRisk > 60 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${burnoutRisk}%` }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <Heart className={`w-4 h-4 ${isolationRisk > 50 ? 'text-rose-500' : 'text-amber-500'}`} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Isolation Risk</span>
                  </div>
                  <span className={`text-xl font-bold ${isolationRisk > 50 ? 'text-rose-500' : 'text-amber-500'}`}>{isolationRisk}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${isolationRisk > 50 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${isolationRisk}%` }} />
                </div>
                {isolationRisk > 40 && (
                  <p className="text-xs text-slate-500 mt-2">Signs of withdrawal detected in recent chats.</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${crisisRisk > 30 ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Crisis Risk</span>
                  </div>
                  <span className={`text-xl font-bold ${crisisRisk > 30 ? 'text-rose-500' : 'text-emerald-500'}`}>{crisisRisk}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${crisisRisk > 30 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${crisisRisk}%` }} />
                </div>
              </div>

              {sessionLogs.length === 0 && (
                <div className="p-3 mt-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500 text-center">
                  Scores will calibrate after your first conversation.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <EmergencyClient 
          contact={user.emergencyContact ? { name: user.emergencyContact.name, email: user.emergencyContact.email } : null}
          escalationEnabled={user.emergencyEscalation}
        />
      </div>
    </div>
  );
}
