import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import RoutineClient from "./client";

export default async function RoutinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  
  // 1. Fetch Scheduled Habits
  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: { userId: session.user.id },
    orderBy: { time: 'asc' }
  });

  // Determine current day type
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Filter to today's schedule based on frequency
  let routineEvents = scheduledHabits.filter(habit => {
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekends" && isWeekend) return true;
    if (habit.frequency === "weekdays" && !isWeekend) return true;
    return false;
  });

  // Sort and determine 'Next Up'
  const nowStr = today.toTimeString().slice(0, 5); // "HH:MM"
  let nextUpFound = false;
  const mappedEvents = routineEvents.map(event => {
    let isCurrent = false;
    if (!nextUpFound && event.time > nowStr) {
      isCurrent = true;
      nextUpFound = true;
    }
    return {
      ...event,
      isCurrent
    };
  });

  // 2. Fetch Executions from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const executions = await prisma.habitExecution.findMany({
    where: { 
      userId: session.user.id,
      createdAt: { gte: sevenDaysAgo }
    },
    include: { habit: true }
  });

  // 3. Compute Weekly Score
  let weeklyScore = 0;
  if (executions.length > 0) {
    const completed = executions.filter(e => e.status === "completed").length;
    weeklyScore = Math.round((completed / executions.length) * 100);
  }

  // 4. Compute Most Consistent and Most Irregular
  const habitStats: Record<string, { total: number; completed: number; name: string }> = {};
  
  executions.forEach(exec => {
    if (!exec.habit) return;
    const hId = exec.scheduledHabitId;
    if (!habitStats[hId]) {
      habitStats[hId] = { total: 0, completed: 0, name: exec.habit.title };
    }
    habitStats[hId].total += 1;
    if (exec.status === "completed") {
      habitStats[hId].completed += 1;
    }
  });

  let mostConsistent = "N/A";
  let mostIrregular = "N/A";
  let highestRate = -1;
  let lowestRate = 101;
  let mostIrregularHabitObj = null;

  Object.values(habitStats).forEach(stat => {
    if (stat.total === 0) return;
    const rate = (stat.completed / stat.total) * 100;
    
    if (rate > highestRate) {
      highestRate = rate;
      mostConsistent = stat.name;
    }
    
    if (rate < lowestRate) {
      lowestRate = rate;
      mostIrregular = stat.name;
      mostIrregularHabitObj = stat;
    }
  });

  if (highestRate === lowestRate && highestRate !== -1) {
    // If all are the same, just set both or keep one empty
    if (highestRate >= 50) mostIrregular = "None! Great job!";
    else mostConsistent = "Needs work";
  }

  if (Object.keys(habitStats).length === 0) {
    mostConsistent = "No data yet";
    mostIrregular = "No data yet";
  }

  // 5. Guardian Advice
  let guardianAdvice = "Keep up the good work! Establish your daily routines to give Guardian enough data to analyze your habits.";
  if (executions.length > 0) {
    if (weeklyScore >= 80) {
      guardianAdvice = `You're crushing it! With a ${weeklyScore}% completion rate this week, your routines are solid. ${mostConsistent !== "N/A" ? `Your "${mostConsistent}" habit is especially locked in.` : ""}`;
    } else if (weeklyScore < 50 && mostIrregularHabitObj) {
      guardianAdvice = `You've been struggling to complete "${mostIrregular}" recently. This might be throwing off your schedule. Try adjusting its time to when you have more energy, or start with a smaller micro-habit version of it.`;
    } else if (mostIrregularHabitObj) {
      guardianAdvice = `Overall you're doing okay, but "${mostIrregular}" is slipping. Consider setting up a specific environment trigger for it to make it easier to remember!`;
    }
  }

  return (
    <RoutineClient 
      routineEvents={mappedEvents}
      weeklyScore={weeklyScore}
      mostConsistent={mostConsistent}
      mostIrregular={mostIrregular}
      guardianAdvice={guardianAdvice}
    />
  );
}
