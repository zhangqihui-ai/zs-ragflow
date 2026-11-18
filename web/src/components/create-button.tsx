import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export function CreateButton({
  children,
  className,
  ...props
}: ButtonProps<boolean>) {
  return (
    <Button
      data-creation-action
      {...props}
      variant="default"
      size="default"
      className={cn(
        'min-w-[120px] focus-visible:ring-2 focus-visible:ring-nav-active-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
        className,
      )}
    >
      <Plus className="size-[1em]" />
      {children}
    </Button>
  );
}
