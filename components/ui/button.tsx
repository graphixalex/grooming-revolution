import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#e2c46f] to-[#cfa43a] text-[#0f1f3d] shadow-sm hover:-translate-y-0.5 hover:from-[#e8cc7f] hover:to-[#d7b14f] hover:shadow-md",
        outline: "border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50",
        ghost: "text-zinc-700 hover:bg-zinc-100",
        destructive: "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-sm hover:-translate-y-0.5 hover:from-red-500 hover:to-red-400",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };

