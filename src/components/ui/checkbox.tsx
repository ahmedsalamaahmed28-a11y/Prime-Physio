"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface GradientCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: number
}

const GradientCheckbox = React.forwardRef<HTMLInputElement, GradientCheckboxProps>(
  ({ className, size = 24, id, style: _style, ...props }, ref) => {
    const generatedId = React.useId()
    const checkboxId = id || generatedId

    return (
      <div
        className={cn("checkbox-wrapper", className)}
        data-size={size}
      >
        <input ref={ref} id={checkboxId} type="checkbox" {...props} />
        <label htmlFor={checkboxId}>
          <div className="tick_mark"></div>
        </label>
      </div>
    )
  }
)
GradientCheckbox.displayName = "GradientCheckbox"

export { GradientCheckbox }
