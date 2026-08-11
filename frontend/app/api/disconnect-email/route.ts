import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CommClient } from "caspian-sdk";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized or missing email" }, { status: 401 });
    }

    // Get the user's current connection ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { caspianEmailConnectionId: true }
    });

    if (!user?.caspianEmailConnectionId) {
      return NextResponse.json({ error: "No active email connection found" }, { status: 400 });
    }

    // Initialize Caspian SDK
    const client = new CommClient();

    // Cold-start the outbound disconnect email (background task)
    client.initiate(
      user.caspianEmailConnectionId,
      session.user.email,
      "email is disconnected u wont get weekly report anymore"
    ).catch((err) => console.error("Background email send failed:", err));

    // Clear the connection ID from the user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { caspianEmailConnectionId: null }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error disconnecting email via Caspian SDK:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
