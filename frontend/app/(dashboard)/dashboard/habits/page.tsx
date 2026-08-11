import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import HabitClient from "./client";

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  
  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: { userId: session.user.id },
    orderBy: { time: 'asc' }
  });

  const executions = await prisma.habitExecution.findMany({
    where: { userId: session.user.id },
    include: { habit: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <HabitClient 
      scheduledHabits={scheduledHabits} 
      executions={executions} 
    />
  );
}
