"use client";

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  checked?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    return (
      <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
        <input 
          type="checkbox" 
          className="sr-only peer" 
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props} 
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all after:duration-300 peer-checked:bg-blue-600"></div>
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
