import { Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Studio Unavailable",
  description: "Sanity Studio is not available in this storefront.",
  path: "/studio",
  index: false,
});

export default function StudioDisabledPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={Wrench}
        title="Sanity Studio removed"
        description="This project is being migrated to Postgres + your Go API."
        action={{ label: "Go to Admin", href: "/admin" }}
        size="lg"
      />
    </div>
  );
}
