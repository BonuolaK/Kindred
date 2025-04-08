import { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateRandomAvatarColor, getAvatarShape } from "@/lib/utils";

type AvatarPlaceholderProps = {
  user?: Partial<User>;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showPhoto?: boolean;
  className?: string;
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

export default function AvatarPlaceholder({
  user,
  name,
  size = "md",
  showPhoto = false,
  className = "",
}: AvatarPlaceholderProps) {
  const displayName = user?.name || name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  
  const userId = user?.id || 0;
  const avatarShape = getAvatarShape(userId);
  const bgColor = generateRandomAvatarColor(displayName);
  
  return (
    <Avatar className={`${getSizeClass(size)} ${className}`}>
      {showPhoto && user?.photoUrl ? (
        <AvatarImage src={user.photoUrl} alt={displayName} />
      ) : (
        <svg
          className="absolute inset-0 h-full w-full text-foreground"
          fill="none"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={avatarShape} fill={bgColor} />
        </svg>
      )}
      <AvatarFallback 
        className="text-foreground font-semibold bg-transparent flex items-center justify-center relative z-10"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}