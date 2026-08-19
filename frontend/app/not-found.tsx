import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Compass className="mb-4 h-8 w-8 text-[var(--foreground-subtle)]" />
      <h1 className="mb-2 text-xl font-semibold">Page not found</h1>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        This page doesn&apos;t exist, or the Claim you&apos;re looking for hasn&apos;t been
        opened yet.
      </p>
      <Button asChild>
        <Link href="/claims">Back to Explorer</Link>
      </Button>
    </div>
  );
}
