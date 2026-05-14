import type { Metadata } from "next";
import { AdminLayoutShell } from "@/components/admin/AdminLayoutShell";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Afrigoals Admin",
  },
  robots: noIndexRobots,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
