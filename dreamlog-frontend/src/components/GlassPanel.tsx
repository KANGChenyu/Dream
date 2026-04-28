import type { ReactNode } from "react";

interface GlassPanelProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function GlassPanel({ title, className, children }: GlassPanelProps) {
  const panelClassName = ["glass-panel", className].filter(Boolean).join(" ");

  return (
    <section className={panelClassName}>
      {title ? (
        <header className="glass-panel__header">
          <h2>{title}</h2>
        </header>
      ) : null}
      <div className="glass-panel__body">{children}</div>
    </section>
  );
}
