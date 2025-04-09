import { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateRandomAvatarColor, getAvatarShape } from "@/lib/utils";

export const AVATAR_EMOJIS = [
  "😊", "😎", "🤓", "🧐", "🤩", "😇", "🦄", "🐱", "🐶", "🦊", 
  "🦁", "🐯", "🐨", "🐼", "🐸", "🦉", "🦋", "🌟", "🌈", "🌻",
  "🌺", "🍀", "🎮", "🎵", "🎨", "📚", "✨", "💫", "🏄", "🚴",
  "⚽", "🏀", "🎭", "🎧", "📷", "🍕", "🍦", "🍩", "☕", "🎸"
];

type AvatarPlaceholderProps = {
  user?: Partial<User>;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showPhoto?: boolean;
  className?: string;
  onSelectAvatar?: (avatar: string) => void;
  selectable?: boolean;
};

const getSizeClass = (size: string) => {
  switch (size) {
    case "sm":
      return "h-8 w-8";
    case "md":
      return "h-12 w-12";
    case "lg":
      return "h-20 w-20";
    case "xl":
      return "h-32 w-32";
    default:
      return "h-12 w-12";
  }
};

const getFontSizeClass = (size: string) => {
  switch (size) {
    case "sm":
      return "text-sm";
    case "md":
      return "text-xl";
    case "lg":
      return "text-3xl";
    case "xl":
      return "text-5xl";
    default:
      return "text-xl";
  }
};

export default function AvatarPlaceholder({
  user,
  name,
  size = "md",
  showPhoto = false,
  className = "",
  onSelectAvatar,
  selectable = false,
}: AvatarPlaceholderProps) {
  const displayName = user?.username || user?.name || name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  
  const userId = user?.id || 0;
  const avatarShape = getAvatarShape(userId);
  const bgColor = generateRandomAvatarColor(displayName);
  const textSizeClass = getFontSizeClass(size);
  
  return (
    <div className={selectable ? "relative group" : ""}>
      <Avatar className={`${getSizeClass(size)} ${className}`}>
        {showPhoto && user?.photoUrl ? (
          <AvatarImage src={user.photoUrl} alt={displayName} />
        ) : user?.avatar ? (
          <div 
            className={`flex items-center justify-center h-full w-full ${textSizeClass}`}
            style={{ backgroundColor: bgColor }}
          >
            {user.avatar}
          </div>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-full w-full text-foreground"
                fill="none"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={avatarShape} fill={bgColor} />
              </svg>
            </div>
            <AvatarFallback 
              className={`text-foreground font-semibold bg-transparent flex items-center justify-center z-10 ${textSizeClass}`}
            >
              {initials}
            </AvatarFallback>
          </>
        )}
      </Avatar>
      
      {selectable && onSelectAvatar && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/40 rounded-full transition-opacity">
          <button 
            onClick={() => onSelectAvatar("")}
            className="text-xs bg-white text-gray-800 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}