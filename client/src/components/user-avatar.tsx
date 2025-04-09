import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { generateRandomAvatarColor, generateUserIcon } from "@/lib/utils";

type UserAvatarProps = {
  user?: Partial<User>;
  size?: "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  showName?: boolean;
  showPhoto?: boolean;
  className?: string;
};

export default function UserAvatar({
  user,
  size = "md",
  showBadge = false,
  showName = false,
  showPhoto = false,
  className = "",
}: UserAvatarProps) {
  
  // Size mappings
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-xl",
  };
  
  const emojiSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
    xl: "text-3xl",
  };
  
  // Get user initial or placeholder
  const displayName = user?.username || user?.name || "User";
  const initial = displayName.charAt(0).toUpperCase();
  
  // Get a consistent avatar icon based on the user id or some other property
  const iconSvg = generateUserIcon(user?.id || 0);
  const bgColor = generateRandomAvatarColor(displayName);
  
  return (
    <div className={`relative ${className}`}>
      <Avatar className={`${sizeClasses[size]} bg-gradient-to-br from-primary-100 to-primary-200`}>
        {user?.photoUrl && showPhoto && (
          <AvatarImage src={user.photoUrl} alt={displayName} className="object-cover" />
        )}
        {user?.avatar ? (
          <AvatarFallback className={`${emojiSizeClasses[size]} flex items-center justify-center`} style={{ backgroundColor: bgColor }}>
            {user.avatar}
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary/10 text-primary">
            <div className="w-full h-full flex items-center justify-center" 
                dangerouslySetInnerHTML={{ __html: iconSvg }} />
          </AvatarFallback>
        )}
      </Avatar>
      
      {showBadge && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
      )}
      
      {showName && (
        <p className="mt-1 text-sm font-medium text-center truncate max-w-[100px]">
          {displayName}
        </p>
      )}
    </div>
  );
}