import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const typographyVariants = cva("text-foreground font-sans", {
  variants: {
    variant: {
      title: "",
      subtitle: "",
      body: "",
      caption: "",
    },
    size: {
      l: "",
      m: "",
      s: "",
    },
    weight: {
      book: "font-normal",
      medium: "font-medium",
      heavy: "font-black",
    },
  },
  compoundVariants: [
    { variant: "title", size: "l", className: "text-[28px] leading-[40px]" },
    { variant: "title", size: "m", className: "text-[22px] leading-[32px]" },
    { variant: "title", size: "s", className: "text-[18px] leading-[24px]" },
    { variant: "subtitle", size: "m", className: "text-[16px] leading-[24px]" },
    { variant: "body", size: "l", className: "text-[16px] leading-[24px]" },
    { variant: "body", size: "m", className: "text-[14px] leading-[20px]" },
    { variant: "body", size: "s", className: "text-[12px] leading-[16px]" },
    { variant: "caption", size: "s", className: "text-[12px] leading-[16px]" },
  ],
  defaultVariants: {
    variant: "body",
    size: "m",
    weight: "medium",
  },
})

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType
}

export function Typography({
  as,
  className,
  variant = "body",
  size,
  weight,
  ...props
}: TypographyProps) {
  const Component = as ?? "p"
  const resolvedSize =
    size ?? (variant === "caption" ? "s" : variant === "subtitle" ? "m" : "m")
  const resolvedWeight =
    weight ??
    (variant === "caption" ? "book" : variant === "subtitle" ? "medium" : "medium")

  return (
    <Component
      className={cn(
        typographyVariants({
          variant,
          size: resolvedSize,
          weight: resolvedWeight,
        }),
        className
      )}
      {...props}
    />
  )
}
