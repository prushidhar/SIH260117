import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 shadow-xs',
        gradient:
          'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xs font-mono font-semibold active:scale-[0.98]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 shadow-xs',
        outline:
          'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 shadow-2xs',
        secondary:
          'bg-slate-100 dark:bg-zinc-850 text-slate-900 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-zinc-800/60',
        ghost:
          'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300',
        link:
          'text-violet-600 underline-offset-4 hover:underline dark:text-violet-400',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs font-semibold',
        warning:
          'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-xs font-semibold',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        xs: 'h-7 rounded-md px-2 text-[11px]',
        lg: 'h-10 rounded-xl px-6 text-sm',
        icon: 'h-8 w-8 p-0 flex items-center justify-center rounded-lg',
        'icon-sm': 'h-7 w-7 p-0 flex items-center justify-center rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
