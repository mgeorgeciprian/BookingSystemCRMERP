"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "cta";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-brand-blue text-white hover:bg-brand-blue-light shadow-sm disabled:opacity-50",
  secondary:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50",
  destructive:
    "bg-brand-red text-white hover:bg-red-800 shadow-sm disabled:opacity-50",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50",
  cta:
    "bg-brand-orange text-white hover:bg-orange-700 shadow-sm shadow-orange-200 disabled:opacity-50",
};

const sizeStyles: Record<string, string> = {
  sm: "min-h-[36px] px-3 py-1.5 text-xs",
  md: "min-h-[44px] px-4 py-2 text-sm",
  lg: "min-h-[52px] px-6 py-3 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps };
