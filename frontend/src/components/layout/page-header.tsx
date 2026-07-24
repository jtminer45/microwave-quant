import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  disclaimer?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, subtitle, disclaimer, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {disclaimer && (
        <p className="mb-2 text-xs font-mono text-amber/80 flex items-center gap-1.5">
          ⚠ {disclaimer}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-ink-muted">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
