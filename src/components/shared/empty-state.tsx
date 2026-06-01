import Link from 'next/link';
import { MessageSquare, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon: Icon = MessageSquare,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`flex flex-col items-center text-center ${
        isCompact ? 'py-8' : 'py-20'
      }`}
    >
      <Icon
        className={`mb-3 text-zinc-700 ${
          isCompact ? 'h-10 w-10' : 'h-16 w-16'
        }`}
      />
      <h3
        className={`font-medium ${
          isCompact ? 'text-zinc-400' : 'text-lg'
        }`}
      >
        {title}
      </h3>
      {description && (
        <p className={`mt-2 text-sm text-zinc-500 ${isCompact ? 'max-w-xs' : 'max-w-sm'}`}>
          {description}
        </p>
      )}
      {action && (
        <Link href={action.href}>
          <Button
            className={`mt-6 ${isCompact ? 'border-zinc-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            variant={isCompact ? 'outline' : 'default'}
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
