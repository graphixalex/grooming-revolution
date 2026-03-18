import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none ring-[#1f355f] placeholder:text-zinc-400 focus:border-[#1f355f] focus:ring-2",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };

