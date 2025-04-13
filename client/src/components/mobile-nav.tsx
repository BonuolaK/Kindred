import { useLocation } from "wouter";
import { Home, Heart, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  activeTab?: string;
};

export default function MobileNav({ activeTab }: MobileNavProps) {
  const [location, navigate] = useLocation();
  
  // Don't show mobile nav on landing page, auth page, or call page
  if (location === "/" || location === "/auth" || location.includes("/call/")) {
    return null;
  }

  const tabs = [
    { id: "home", label: "Home", icon: <Home className="text-xl" />, path: "/home" },
    { id: "matches", label: "Matches", icon: <Heart className="text-xl" />, path: "/matches" },
    { id: "chats", label: "Chats", icon: <MessageCircle className="text-xl" />, path: "/chats" },
    { id: "profile", label: "Profile", icon: <User className="text-xl" />, path: "/profile" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
      <div className="flex justify-around items-center py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex flex-col items-center",
              (activeTab === tab.id || location === tab.path)
                ? "text-primary"
                : "text-gray-500"
            )}
            onClick={() => navigate(tab.path)}
          >
            {tab.icon}
            <span className="text-xs mt-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
