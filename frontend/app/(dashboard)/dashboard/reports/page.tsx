import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReportsClient } from "./client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Reports</h1>
        <p className="text-slate-500">View and generate AI analysis reports of your habits, tasks, and mood.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        <ReportsClient />
      </div>
    </div>
  );
}
