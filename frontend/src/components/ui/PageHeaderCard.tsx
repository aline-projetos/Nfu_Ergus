import { ReactNode } from 'react';

interface PageHeaderCardProps {
  icon: ReactNode;
  title: string;
}

export function PageHeaderCard({ icon, title }: PageHeaderCardProps) {
  return (
    <div className="flex items-center gap-3 p-6 border-b border-border">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
    </div>
  );
}
