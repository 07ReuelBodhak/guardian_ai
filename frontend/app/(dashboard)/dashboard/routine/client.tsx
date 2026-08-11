"use client";

import { Calendar as CalendarIcon, Clock, Coffee, Moon, BookOpen, Dumbbell, Briefcase, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RoutineClient({ 
  routineEvents, 
  weeklyScore, 
  mostConsistent, 
  mostIrregular,
  guardianAdvice 
}: {
  routineEvents: any[];
  weeklyScore: number;
  mostConsistent: string;
  mostIrregular: string;
  guardianAdvice: string;
}) {

  // A helper to pick an icon based on title or type heuristics if we don't store icons in DB
  const getIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("work") || lower.includes("gym") || lower.includes("exercise") || lower.includes("run")) return <Dumbbell className="w-4 h-4 text-emerald-500" />;
    if (lower.includes("eat") || lower.includes("food") || lower.includes("break") || lower.includes("dinner") || lower.includes("lunch")) return <Coffee className="w-4 h-4 text-amber-500" />;
    if (lower.includes("read") || lower.includes("study") || lower.includes("learn")) return <BookOpen className="w-4 h-4 text-violet-500" />;
    if (lower.includes("sleep") || lower.includes("wake") || lower.includes("bed") || lower.includes("wind")) return <Moon className="w-4 h-4 text-indigo-500" />;
    if (lower.includes("code") || lower.includes("work") || lower.includes("job") || lower.includes("meeting")) return <Briefcase className="w-4 h-4 text-blue-500" />;
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Daily Routine</h1>
        <p className="text-slate-500">Guardian adapts to your schedule to provide timely check-ins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Today&apos;s Schedule</CardTitle>
                <CardDescription>Generated from your connected calendars and chats</CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                Optimized
              </Badge>
            </CardHeader>
            <CardContent>
              {routineEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p>No habits scheduled for today. Create some in the Habits tab!</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 md:ml-6 space-y-8 pb-4">
                  {routineEvents.map((event, i) => (
                    <div key={i} className="relative pl-6 md:pl-8">
                      <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{event.time}</span>
                            {event.isCurrent && (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">Next Up</Badge>
                            )}
                          </div>
                          <h4 className="text-base font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            {getIcon(event.title)} {event.title}
                          </h4>
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md self-start sm:self-auto capitalize">
                          Habit
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Routine Adherence</CardTitle>
              <CardDescription>How well you stick to your plans (Last 7 Days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-6">
                <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-indigo-100 dark:border-indigo-900">
                  <div 
                    className="absolute inset-0 rounded-full border-8 border-indigo-600 border-r-transparent border-b-transparent transform rotate-45 transition-all duration-1000"
                    style={{ clipPath: `polygon(0 0, 100% 0, 100% ${weeklyScore}%, 0 ${weeklyScore}%)` }} 
                  />
                  <div className="text-center z-10">
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{weeklyScore}%</div>
                    <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Weekly Score</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1 line-clamp-1" title={mostConsistent}>{mostConsistent}</div>
                  <div className="font-semibold text-emerald-600">Consistent</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1 line-clamp-1" title={mostIrregular}>{mostIrregular}</div>
                  <div className="font-semibold text-amber-500">Irregular</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guardian Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {guardianAdvice}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
