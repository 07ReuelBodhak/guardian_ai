import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, timezone, occupation, motivationStyle } = body;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        timezone,
        occupation,
        motivation: motivationStyle,
        onboarded: true,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
