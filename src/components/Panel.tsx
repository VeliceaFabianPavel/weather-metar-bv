import type { ReactNode } from "react";

interface PanelProps {
  title?: ReactNode;
  id?: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  variant?: "solar" | "cyan";
  noPadding?: boolean;
}

export function Panel({
  title,
  id,
  meta,
  trailing,
  className = "",
  bodyClassName = "",
  children,
  variant = "solar",
  noPadding = false,
}: PanelProps) {
  return (
    <section
      className={`frame ${variant === "cyan" ? "frame-cyan" : ""} ${className}`}
    >
      {(title || trailing || meta) && (
        <header className="frame-header">
          <div className="flex min-w-0 items-baseline gap-3">
            {id && <span className="frame-id">{id}</span>}
            {title && <span className="frame-title truncate">{title}</span>}
            {meta && <span className="frame-meta hidden md:inline">{meta}</span>}
          </div>
          {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
        </header>
      )}
      <div className={noPadding ? bodyClassName : `p-3 md:p-4 ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
