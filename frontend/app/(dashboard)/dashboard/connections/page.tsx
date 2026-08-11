import { MessageCircle, Mail, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ConnectionsClient from "./client";

export default async function ConnectionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: true },
  });

  if (!user) {
    redirect("/login");
  }

  // Determine actual connection statuses
  const isDiscordConnected = !!user.discordId;
  const isTelegramConnected = !!user.telegramId;

  return (
    <ConnectionsClient 
      isDiscordConnected={isDiscordConnected}
      isTelegramConnected={isTelegramConnected}
    />
  );
}
