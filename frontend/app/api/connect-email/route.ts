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

    // Initialize Caspian SDK
    const client = new CommClient(); // Assuming credentials are automatically picked up from env

    // 1. Provision the connection
    const connectResponse = await client.connectEmail();
    const connectionId = connectResponse.id;

    if (!connectionId) {
      throw new Error("Failed to retrieve connectionId from Caspian SDK");
    }

    // 2. Cold-start the outbound email (background task)
    client.initiate(
      connectionId,
      session.user.email,
      "Successfully connected email u will get weekly reports through email"
    ).catch((err) => console.error("Background email send failed:", err));

    // 3. Save the connectionId to the user in the database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { caspianEmailConnectionId: connectionId }
    });

    return NextResponse.json({ success: true, connectionId });
  } catch (error: any) {
    console.error("Error connecting email via Caspian SDK:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
