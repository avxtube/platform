import { AdminShell } from "@/components/admin-shell"
import { requireAdminUser } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser()

  return <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>
}
