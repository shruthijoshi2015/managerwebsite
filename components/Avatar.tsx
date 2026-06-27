import React from "react";

export function Avatar({ name, size = "md", className = "" }: { name: string, size?: "sm" | "md" | "lg" | "xl", className?: string }) {
  const getInitials = (n: string) => {
    const parts = n.split(" ").filter(w => w.length > 0);
    if (parts.length >= 2) return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return "??";
  };
  
  const colors = [
    "bg-red-100 text-red-600 border-red-200",
    "bg-orange-100 text-orange-600 border-orange-200",
    "bg-amber-100 text-amber-600 border-amber-200",
    "bg-green-100 text-green-600 border-green-200",
    "bg-emerald-100 text-emerald-600 border-emerald-200",
    "bg-teal-100 text-teal-600 border-teal-200",
    "bg-cyan-100 text-cyan-600 border-cyan-200",
    "bg-sky-100 text-sky-600 border-sky-200",
    "bg-blue-100 text-blue-600 border-blue-200",
    "bg-indigo-100 text-indigo-600 border-indigo-200",
    "bg-indigo-100 text-indigo-600 border-indigo-200",
    "bg-purple-100 text-purple-600 border-purple-200",
    "bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200",
    "bg-pink-100 text-pink-600 border-pink-200",
    "bg-rose-100 text-rose-600 border-rose-200",
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colorIndex = Math.abs(hash) % colors.length;
  const colorClass = colors[colorIndex];

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-24 h-24 text-3xl font-medium rounded-2xl border-2 shadow-sm"
  };

  const isXl = size === "xl";
  const baseClasses = `flex items-center justify-center font-bold border ${colorClass} ${sizeClasses[size]}`;
  const roundedClass = isXl ? "rounded-2xl shrink-0" : "rounded-full shrink-0";

  return (
    <div className={`${baseClasses} ${roundedClass} ${className}`}>
      {getInitials(name)}
    </div>
  );
}
