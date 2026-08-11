"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.task.delete({
    where: {
      id: taskId,
      userId: session.user.id, // ensure user owns the task
    },
  });

  revalidatePath("/dashboard/goals");
}

export async function updateTask(taskId: string, data: { title: string; description?: string; dueDate?: string | null }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.task.update({
    where: {
      id: taskId,
      userId: session.user.id,
    },
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
    },
  });

  revalidatePath("/dashboard/goals");
}
