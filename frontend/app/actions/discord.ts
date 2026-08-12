"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function generateDiscordConnectCode() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordConnectCode: code },
  });

  return code;
}

export async function disconnectDiscord() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { 
      discordId: null,
      discordConnectCode: null
    },
  });
}

export async function checkDiscordConnection() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { discordId: true }
  });

  return !!user?.discordId;
}
