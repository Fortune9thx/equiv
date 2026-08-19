import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card-surface card-hover rounded-[var(--radius-lg)] p-6",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold leading-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--foreground-muted)]", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex items-center gap-3", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
