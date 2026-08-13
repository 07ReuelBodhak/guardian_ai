"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function updatePreferredPlatform(platform: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }
  
  if (platform !== "discord" && platform !== "telegram") {
    return { success: false, error: "Invalid platform" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredPlatform: platform }
    });
    
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update preferred platform:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
