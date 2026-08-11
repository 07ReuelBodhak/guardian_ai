"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function updateUserSettings(data: {
  name?: string;
  timezone?: string;
  motivation?: string;
  dailySummary?: boolean;
  goalReminders?: boolean;
  proactiveCheckins?: boolean;
  autoMonthlyReport?: boolean;
  emergencyEscalation?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
