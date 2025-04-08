import React from "react";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const Logo: React.FC<LogoProps> = ({ size = "md", className }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-10 h-10 text-2xl",
    lg: "w-16 h-16 text-3xl",
  };

  return (
    <div
      className={cn(
        "bg-primary rounded-lg flex items-center justify-center text-white font-heading font-bold",
        sizeClasses[size],
        className
      )}
    >
      K
    </div>
  );
};

export default Logo;
