"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  colorBar?: string;
  className?: string;
}

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  colorBar,
  className,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap: focus the panel when opened
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 animate-fade-in"
        onClick={onClose}
        aria-label="Inchide"
      />

      {/* Panel - right-anchored on desktop, full-width bottom on mobile */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white shadow-2xl animate-slide-in-right overflow-y-auto outline-none flex flex-col",
          className
        )}
      >
        {/* Color bar */}
        {colorBar && (
          <div className="h-2 shrink-0" style={{ backgroundColor: colorBar }} />
        )}

        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
            <div>
              {title && (
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              )}
              {subtitle && (
                <p className="text-xs text-gray-400">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Inchide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
