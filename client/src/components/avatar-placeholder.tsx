import { useState, useEffect } from "react";
import { User } from "@shared/schema";
import { cn, getAvatarShape, generateRandomAvatarColor } from "@/lib/utils";

type AvatarPlaceholderProps = {
  user?: Partial<User>;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showPhoto?: boolean;
  className?: string;
};

export default function AvatarPlaceholder({
  user,
  name,
  size = "md",
  showPhoto = false,
  className,
}: AvatarPlaceholderProps) {
  const [seed] = useState(() => Math.random().toString(36).substring(7));
  
  const displayName = user?.name || name || "?";
  const initial = displayName.charAt(0).toUpperCase();
  const userId = user?.id || 1;
  const avatarShape = getAvatarShape(userId);
  const gradientColor = generateRandomAvatarColor(user?.name || seed);
  
  const sizeClasses = {
    sm: "w-10 h-10 text-md",
    md: "w-16 h-16 text-xl",
    lg: "w-24 h-24 text-3xl",
    xl: "w-32 h-32 text-5xl",
  };

  const photoUrl = user?.photoUrl;
  const canShowPhoto = showPhoto && photoUrl;

  return (
    <div
      className={cn(
        "flex items-center justify-center font-bold text-white",
        avatarShape,
        `bg-gradient-to-br ${gradientColor}`,
        sizeClasses[size],
        className
      )}
      style={canShowPhoto ? { backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {!canShowPhoto && initial}
    </div>
  );
}
