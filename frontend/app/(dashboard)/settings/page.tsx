import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import SettingsForm from "./settings-form";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      preferredPlatform: true,
      discordId: true,
      telegramId: true,
    }
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Account Settings</h1>
        <p className="text-[#64748B]">Manage your notification preferences and platform routing.</p>
      </div>
      
      <SettingsForm 
        initialPlatform={user.preferredPlatform || "discord"}
        discordConnected={!!user.discordId}
        telegramConnected={!!user.telegramId}
      />
    </div>
  );
}
