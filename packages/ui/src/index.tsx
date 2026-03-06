import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-indigo-700 text-white hover:bg-indigo-600"
      : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50";
  return (
    <button
      className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition ${styles} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`} {...props} />;
}

