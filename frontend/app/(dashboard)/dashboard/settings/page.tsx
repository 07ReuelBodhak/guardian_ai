import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import SettingsClient from "./client";

const prisma = new PrismaClient();

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    redirect("/login");
  }

  // Pass down the serializable fields that the client needs
  const userData = {
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    motivation: user.motivation,
    dailySummary: user.dailySummary,
    goalReminders: user.goalReminders,
    proactiveCheckins: user.proactiveCheckins,
    autoMonthlyReport: user.autoMonthlyReport,
    emergencyEscalation: user.emergencyEscalation
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-slate-500">Manage your profile, preferences, and Guardian&apos;s behavior.</p>
      </div>

      <SettingsClient user={userData} />
    </div>
  );
}
