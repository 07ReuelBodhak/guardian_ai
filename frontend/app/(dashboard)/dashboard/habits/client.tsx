"use client";

import { Activity, Clock, Trash2, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createHabit, deleteHabit } from "./actions";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function HabitClient({ scheduledHabits, executions }: { scheduledHabits: any[], executions: any[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Habit Tracker</h1>
        <p className="text-slate-500">Schedule daily habits and let the AI keep you accountable.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Schedule a Habit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              Schedule a Habit
            </CardTitle>
            <CardDescription>Set a specific time for Guardian to check on you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={(formData) => startTransition(() => createHabit(formData))} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Habit Name</label>
                <input required type="text" name="title" placeholder="e.g., Drink Water" className="w-full p-2 border border-slate-700 bg-transparent text-slate-100 rounded-md outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium text-slate-400">Time (HH:MM)</label>
                  <input required type="time" name="time" className="w-full p-2 border border-slate-700 bg-transparent text-slate-100 rounded-md outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium text-slate-400">Frequency</label>
                  <select name="frequency" className="w-full p-2 border border-slate-700 rounded-md outline-none focus:border-indigo-500 bg-transparent text-slate-100">
                    <option className="bg-slate-900" value="daily">Daily</option>
                    <option className="bg-slate-900" value="weekdays">Weekdays</option>
                    <option className="bg-slate-900" value="weekends">Weekends</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending}>
                {isPending ? "Adding..." : "Add Habit"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Scheduled Habits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Active Habits
            </CardTitle>
            <CardDescription>Your current scheduled habits</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledHabits.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <p>No habits scheduled yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledHabits.map((habit) => (
                  <div key={habit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{habit.title}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {habit.time} • {habit.frequency}
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => startTransition(() => deleteHabit(habit.id))}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Recent Logs
            </CardTitle>
            <CardDescription>Your habit history log</CardDescription>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p>No history available. Let Guardian check on you first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-colors bg-white dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      {exec.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : exec.status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500" />
                      )}
                      <span className="font-medium text-slate-700 dark:text-slate-200">{exec.habit?.title || "Unknown Habit"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        exec.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                        exec.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {exec.status}
                      </span>
                      <span className="text-slate-400">
                        {exec.dateString}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
