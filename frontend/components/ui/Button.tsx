"use client";

import { HTMLMotionProps, motion } from "framer-motion";
import clsx from "clsx";
import { ReactNode } from "react";

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: ReactNode;
  variant?: "primary" | "danger" | "outline";
  className?: string;
};

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className,
  disabled = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    "px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-teal-500 hover:bg-teal-600 text-white shadow-md",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-md",
    outline: "border border-slate-300 hover:bg-slate-100 text-slate-700",
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
