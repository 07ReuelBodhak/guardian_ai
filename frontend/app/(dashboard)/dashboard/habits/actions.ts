"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createHabit(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const title = formData.get("title") as string;
  const time = formData.get("time") as string;
  const frequency = formData.get("frequency") as string;
  
  if (!title || !time || !frequency) throw new Error("Missing fields");
  
  const currentCount = await prisma.scheduledHabit.count({
    where: { userId: session.user.id }
  });
  
  if (currentCount >= 10) {
    throw new Error("Maximum of 10 habits reached. Please delete some before adding more.");
  }
  
  await prisma.scheduledHabit.create({
    data: {
      userId: session.user.id,
      title,
      time,
      frequency
    }
  });
  
  revalidatePath("/dashboard/habits");
}

export async function deleteHabit(habitId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  await prisma.scheduledHabit.deleteMany({
    where: {
      id: habitId,
      userId: session.user.id
    }
  });
  
  revalidatePath("/dashboard/habits");
}
