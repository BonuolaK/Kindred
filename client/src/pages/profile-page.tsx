import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { profileSchema } from "@shared/schema";
import { ukCities } from "@/lib/uk-cities";
import AvatarPlaceholder from "@/components/avatar-placeholder";
import AvatarSelector from "@/components/avatar-selector";
import Onboarding from "@/components/onboarding";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MobileNav from "@/components/mobile-nav";
import { Loader2 } from "lucide-react";

// Extended profile schema for validation
const extendedProfileSchema = profileSchema.extend({
  // Additional validation rules
  age: z.number().min(18, "You must be at least 18 years old").max(120),
  gender: z.string().min(1, "Please select your gender"),
  interestedGenders: z.array(z.string()).min(1, "Please select at least one gender"),
});

type ProfileFormValues = z.infer<typeof extendedProfileSchema>;

export default function ProfilePage() {
  const { user, updateProfileMutation } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Default values from user
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(extendedProfileSchema),
    defaultValues: {
      name: user?.name || "",
      age: user?.age || undefined,
      gender: user?.gender || "",
      interestedGenders: user?.interestedGenders || [],
      location: user?.location || "",
      bio: user?.bio || "",
      photoUrl: user?.photoUrl || "",
      avatar: user?.avatar || "",
      communicationStyle: user?.communicationStyle || "",
      freeTimeActivities: user?.freeTimeActivities || [],
      values: user?.values || "",
      conflictResolution: user?.conflictResolution || "",
      loveLanguage: user?.loveLanguage || "",
      relationshipPace: user?.relationshipPace || "",
      dealbreakers: user?.dealbreakers || [],
    },
  });
  
  const onSubmit = (data: ProfileFormValues) => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }
    
    // Final submission
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        navigate("/home");
      }
    });
  };
  
  const goToPreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Reload the user data
    window.location.reload();
  };
  
  if (showOnboarding) {
    // Return onboarding component with initial step set to name (step 2)
    return <Onboarding onComplete={handleOnboardingComplete} initialStep={2} />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col items-center text-center gap-6 mb-8">
          <div 
            className="cursor-pointer"
            onClick={() => setDialogOpen(true)}
          >
            <AvatarPlaceholder
              name={user?.username || user?.name || ""}
              user={{ avatar: user?.avatar }}
              size="xl"
              showPhoto={false}
            />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-gray-900">
              {user?.name ? `${user.name}'s Profile` : 'Complete Your Profile'}
            </h1>
            <p className="text-gray-600 mt-1">
              Help us find your most compatible matches
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                Change Avatar
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => setShowOnboarding(true)}
              >
                Update Profile
              </Button>
            </div>
          </div>
        </div>
        
        <AvatarSelector
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          currentAvatar={user?.avatar || ""}
          onSelect={(emoji) => {
            // Update user avatar
            updateProfileMutation.mutate({ avatar: emoji }, {
              onSuccess: () => {
                setDialogOpen(false);
              }
            });
          }}
        />
        
        {/* Profile summary card */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                  <p className="capitalize">{user?.gender ? user.gender : 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Interested in</h3>
                  <p className="capitalize">
                    {user?.interestedGenders && Array.isArray(user.interestedGenders) && user.interestedGenders.length > 0 
                      ? user.interestedGenders.map(g => g).join(', ')
                      : 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Location</h3>
                  <p>{user?.location || 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Age Preference</h3>
                  <p>
                    {user?.agePreferenceMin && user?.agePreferenceMax 
                      ? `${user.agePreferenceMin} - ${user.agePreferenceMax}`
                      : 'Not specified'}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">About Me</h3>
                <p className="text-sm">{user?.bio || 'No bio provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>
              Manage your subscription to get more matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Current Plan</h3>
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {user?.profileType === 'basic' ? 'Basic Plan' : 
                         user?.profileType === 'premium' ? 'Premium Plan' : 
                         user?.profileType === 'elite' ? 'Elite Plan' : 'Basic Plan'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {user?.profileType === 'basic' ? 'Up to 3 matches' : 
                         user?.profileType === 'premium' ? 'Up to 5 matches' : 
                         user?.profileType === 'elite' ? 'Unlimited matches' : 'Up to 3 matches'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <h3 className="text-lg font-medium">Available Plans</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Basic Plan */}
                  <div className={`border rounded-lg p-4 ${user?.profileType === 'basic' ? 'ring-2 ring-primary' : ''}`}>
                    <h4 className="font-medium">Basic Plan</h4>
                    <p className="text-2xl font-bold my-2">Free</p>
                    <ul className="space-y-2 mb-4 text-sm">
                      <li>• Up to 3 matches</li>
                      <li>• Audio calls</li>
                      <li>• Basic profile features</li>
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={user?.profileType === 'basic' ? "outline" : "default"}
                      disabled={user?.profileType === 'basic'}
                      onClick={() => {
                        fetch('/api/subscription', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ profileType: 'basic' })
                        })
                        .then(res => {
                          if (res.ok) {
                            return res.json();
                          }
                          throw new Error('Failed to update subscription');
                        })
                        .then(() => {
                          window.location.reload();
                        })
                        .catch(err => {
                          console.error(err);
                          alert('Failed to update subscription');
                        });
                      }}
                    >
                      {user?.profileType === 'basic' ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </div>

                  {/* Premium Plan */}
                  <div className={`border rounded-lg p-4 ${user?.profileType === 'premium' ? 'ring-2 ring-primary' : ''}`}>
                    <h4 className="font-medium">Premium Plan</h4>
                    <p className="text-2xl font-bold my-2">£9.99/mo</p>
                    <ul className="space-y-2 mb-4 text-sm">
                      <li>• Up to 5 matches</li>
                      <li>• Priority matching</li>
                      <li>• Extended calls</li>
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={user?.profileType === 'premium' ? "outline" : "default"}
                      disabled={user?.profileType === 'premium'}
                      onClick={() => {
                        // In a real application, this would integrate with a payment gateway
                        // For now, we'll just update the subscription type directly
                        fetch('/api/subscription', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ profileType: 'premium' })
                        })
                        .then(res => {
                          if (res.ok) {
                            return res.json();
                          }
                          throw new Error('Failed to update subscription');
                        })
                        .then(() => {
                          window.location.reload();
                        })
                        .catch(err => {
                          console.error(err);
                          alert('Failed to update subscription');
                        });
                      }}
                    >
                      {user?.profileType === 'premium' ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </div>

                  {/* Elite Plan */}
                  <div className={`border rounded-lg p-4 ${user?.profileType === 'elite' ? 'ring-2 ring-primary' : ''}`}>
                    <h4 className="font-medium">Elite Plan</h4>
                    <p className="text-2xl font-bold my-2">£19.99/mo</p>
                    <ul className="space-y-2 mb-4 text-sm">
                      <li>• Unlimited matches</li>
                      <li>• VIP matching</li>
                      <li>• Premium features</li>
                      <li>• Priority support</li>
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={user?.profileType === 'elite' ? "outline" : "default"}
                      disabled={user?.profileType === 'elite'}
                      onClick={() => {
                        // In a real application, this would integrate with a payment gateway
                        // For now, we'll just update the subscription type directly
                        fetch('/api/subscription', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ profileType: 'elite' })
                        })
                        .then(res => {
                          if (res.ok) {
                            return res.json();
                          }
                          throw new Error('Failed to update subscription');
                        })
                        .then(() => {
                          window.location.reload();
                        })
                        .catch(err => {
                          console.error(err);
                          alert('Failed to update subscription');
                        });
                      }}
                    >
                      {user?.profileType === 'elite' ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <p className="text-sm text-muted-foreground">
              Subscription changes will take effect immediately. Cancel anytime from your account settings.
            </p>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
      <MobileNav activeTab="profile" />
    </div>
  );
}