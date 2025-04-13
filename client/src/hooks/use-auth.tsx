import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser, loginSchema, registrationSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { identifyUser, resetUser, trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { z } from "zod";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegistrationData>;
  updateProfileMutation: UseMutationResult<User, Error, Partial<User>>;
};

type LoginData = z.infer<typeof loginSchema>;
type RegistrationData = z.infer<typeof registrationSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" })
  });
  
  // Use effect to identify the user in PostHog when user data changes
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        username: user.username,
        email: user.email,
        profile_type: user.profileType,
        account_created: user.createdAt
      });
    }
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Track successful login in PostHog
      trackEvent(ANALYTICS_EVENTS.USER_LOGIN, {
        $set: {
          username: user.username,
          profile_type: user.profileType,
        }
      });
      
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
    },
    onError: (error: Error) => {
      // Track failed login attempt
      trackEvent(ANALYTICS_EVENTS.LOGIN_FAILED, {
        error: error.message || "Invalid username or password"
      });
      
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegistrationData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Track successful registration in PostHog
      trackEvent(ANALYTICS_EVENTS.USER_REGISTERED, {
        $set: {
          username: user.username,
          email: user.email,
          profile_type: user.profileType || "basic"
        }
      });
      
      toast({
        title: "Account created",
        description: "Welcome to Kindred! Let's complete your profile.",
      });
    },
    onError: (error: Error) => {
      // Track failed registration
      trackEvent(ANALYTICS_EVENTS.REGISTRATION_FAILED, {
        error: error.message || "Unable to create account"
      });
      
      toast({
        title: "Registration failed",
        description: error.message || "Unable to create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Track user logout in PostHog before clearing user data
      if (user?.id) {
        trackEvent(ANALYTICS_EVENTS.USER_LOGOUT, {
          user_id: user.id,
          username: user.username
        });
      }
      
      // Reset user identification in PostHog
      resetUser();
      
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      // Track logout failure
      trackEvent(ANALYTICS_EVENTS.APP_ERROR, {
        error_type: "logout_failed",
        error: error.message
      });
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<User>) => {
      const res = await apiRequest("PUT", "/api/profile", profileData);
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // Track profile update in PostHog
      trackEvent(ANALYTICS_EVENTS.PROFILE_UPDATED, {
        $set: {
          // Update user properties in PostHog
          username: updatedUser.username,
          email: updatedUser.email,
          profile_type: updatedUser.profileType,
          gender: updatedUser.gender,
          location: updatedUser.location,
          has_photo: !!updatedUser.photoUrl,
          profile_completed: true
        },
        // Track which fields were updated (for analytics)
        updated_fields: Object.keys(updatedUser)
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      // Track profile update failure
      trackEvent(ANALYTICS_EVENTS.PROFILE_UPDATE_FAILED, {
        error: error.message || "Unable to update profile"
      });
      
      toast({
        title: "Update failed",
        description: error.message || "Unable to update profile",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
