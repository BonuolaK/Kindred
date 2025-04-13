import React from "react";
import { cn } from "@/lib/utils";
import kindredLogo from "@assets/kindred purple.png";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const Logo: React.FC<LogoProps> = ({ size = "md", className }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img 
        src={kindredLogo} 
        alt="Kindred Logo" 
        className={cn(sizeClasses[size])}
      />
    </div>
  );
};

export default Logo;
