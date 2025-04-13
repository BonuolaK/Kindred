import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "./logo";
import { UserCircle, Menu, LogOut, Settings, MessageCircle } from "lucide-react";

export default function Header() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/");
  };

  const isAuthPage = location === "/auth";
  const isLandingPage = location === "/";

  if (isLandingPage || isAuthPage) {
    return null; // Don't show header on landing or auth pages
  }

  return (
    <header className="bg-white shadow-sm py-3 sticky top-0 z-20">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center cursor-pointer" onClick={() => navigate("/home")}>
          <Logo />
          <span className="ml-2 text-gray-800 font-heading font-semibold text-xl">Kindred</span>
        </div>

        <div className="hidden md:flex space-x-6">
          <Button
            variant="ghost"
            className={location === "/home" ? "text-primary" : "text-gray-600 hover:text-primary"}
            onClick={() => navigate("/home")}
          >
            Home
          </Button>
          <Button
            variant="ghost"
            className={location.includes("/match") ? "text-primary" : "text-gray-600 hover:text-primary"}
            onClick={() => navigate("/matches")}
          >
            Matches
          </Button>
          <Button
            variant="ghost"
            className={location.includes("/chat") ? "text-primary" : "text-gray-600 hover:text-primary"}
            onClick={() => navigate("/chats")}
          >
            Chats
          </Button>
          <Button
            variant="ghost"
            className={location === "/profile" ? "text-primary" : "text-gray-600 hover:text-primary"}
            onClick={() => navigate("/profile")}
          >
            Profile
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-2">
              <UserCircle className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/chats")}>
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Chats</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
