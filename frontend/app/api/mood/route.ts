import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch session logs for the user, ordered by creation date
    const sessionLogs = await prisma.sessionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Fetch the user's baseline
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { textingBaseline: true },
    });

    return NextResponse.json({
      sessionLogs,
      baseline: user?.textingBaseline ? JSON.parse(user.textingBaseline) : null,
    });
  } catch (error) {
    console.error("Error fetching mood data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
