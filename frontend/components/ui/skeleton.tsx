import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-hover)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
