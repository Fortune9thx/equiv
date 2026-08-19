"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="mb-4 h-8 w-8 text-[var(--danger)]" />
      <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
