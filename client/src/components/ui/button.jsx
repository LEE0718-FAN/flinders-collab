import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary/92 text-primary-foreground shadow-[0_14px_30px_-16px_rgba(67,97,238,0.65)] hover:bg-primary hover:shadow-[0_18px_36px_-16px_rgba(67,97,238,0.72)]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-white/45 bg-white/55 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur-xl hover:bg-white/72 hover:text-accent-foreground',
        secondary: 'bg-white/65 text-secondary-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl hover:bg-white/78',
        ghost: 'hover:bg-white/55 hover:text-accent-foreground hover:backdrop-blur-xl',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
