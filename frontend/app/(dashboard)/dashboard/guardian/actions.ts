"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function toggleEmergencyEscalation(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emergencyEscalation: enabled }
  });

  revalidatePath("/dashboard/guardian");
  return { success: true };
}

export async function setEmergencyContact(name: string, email: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Upsert the emergency contact
  await prisma.emergencyContact.upsert({
    where: { userId: session.user.id },
    update: {
      name,
      email
    },
    create: {
      userId: session.user.id,
      name,
      email
    }
  });

  // Also turn it on automatically when they add someone
  await prisma.user.update({
    where: { id: session.user.id },
    data: { emergencyEscalation: true }
  });

  revalidatePath("/dashboard/guardian");
  return { success: true };
}

export async function deleteEmergencyContact() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.emergencyContact.deleteMany({
    where: { userId: session.user.id }
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emergencyEscalation: false }
  });

  revalidatePath("/dashboard/guardian");
  return { success: true };
}
