import type * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@humansignal/shad/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-slate-300 data-[state=unchecked]:bg-slate-300/80",
        "dark:data-[state=checked]:bg-slate-700 dark:data-[state=unchecked]:bg-slate-800",
        "focus-visible:border-ring focus-visible:ring-ring/50",
        "shadow-md", // Increased shadow for better visibility
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full transition-transform",
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:bg-[rgb(76,95,169)] data-[state=unchecked]:bg-white",
          "data-[state=checked]:shadow-[0_5px_10px_var(--color-primary-shadow),inset_0_-1px_0_rgba(var(--color-primary-shadow)/10%)]",
          "dark:data-[state=unchecked]:bg-slate-400",
          "ring-0",
        )}
        style={
          {
            "--color-primary-shadow": "rgba(76, 95, 169, 0.5)",
          } as React.CSSProperties
        }
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
