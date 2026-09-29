import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs',
        secondary:
          'border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200',
        outline:
          'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300',
        success:
          'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
        warning:
          'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
        destructive:
          'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
        indigo:
          'border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200',
        cyan:
          'border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
