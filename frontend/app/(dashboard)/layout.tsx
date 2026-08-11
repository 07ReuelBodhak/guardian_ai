import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PrismaClient } from "@prisma/client"
import DashboardLayoutClient from "./client-layout"

const prisma = new PrismaClient()

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  
  if (!user?.onboarded) {
    redirect("/onboarding")
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
