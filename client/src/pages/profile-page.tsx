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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-gray-900">
            {user?.name ? `${user.name}'s Profile` : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-600 mt-1">
            Help us find your most compatible matches
          </p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile Information</CardTitle>
              <div className="text-sm text-gray-500">
                Step {step} of {totalSteps}
              </div>
            </div>
            <CardDescription>
              {step === 1 && "Tell us about yourself"}
              {step === 2 && "Share your relationship preferences"}
              {step === 3 && "Let's understand your communication style"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Your age"
                              min={18}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="non-binary">Non-binary</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="interestedGenders"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Interested In (select all that apply)</FormLabel>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {["male", "female", "non-binary", "other"].map((gender) => (
                              <FormField
                                key={gender}
                                control={form.control}
                                name="interestedGenders"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={gender}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(gender)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, gender])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== gender
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="capitalize">
                                        {gender}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your city" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ukCities.map((city) => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>About Me</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell potential matches about yourself"
                              className="resize-none min-h-[120px]"
                              value={field.value || ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription>
                            Share your interests, hobbies, and what makes you unique
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="freeTimeActivities"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>How do you prefer to spend your free time?</FormLabel>
                            <FormDescription>
                              Select all that apply
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              "Socializing with friends/family",
                              "Enjoying solo activities",
                              "Outdoor adventures",
                              "Creative pursuits",
                              "Learning new skills"
                            ].map((activity) => (
                              <FormField
                                key={activity}
                                control={form.control}
                                name="freeTimeActivities"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={activity}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={(field.value || []).includes(activity)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), activity])
                                              : field.onChange(
                                                  (field.value || []).filter(
                                                    (value) => value !== activity
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel>
                                        {activity}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="values"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Which of these values is most important to you in a relationship?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              className="flex flex-col space-y-1"
                            >
                              {[
                                "Trust and honesty",
                                "Growth and ambition",
                                "Stability and security",
                                "Independence and freedom",
                                "Shared experiences and adventure"
                              ].map((value) => (
                                <FormItem key={value} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={value} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {value}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dealbreakers"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Which of these would be most challenging for you in a relationship?</FormLabel>
                            <FormDescription>
                              Select all that apply
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              "Different lifestyle habits",
                              "Misaligned future goals",
                              "Incompatible financial attitudes",
                              "Different social needs",
                              "Conflicting values or beliefs"
                            ].map((dealbreaker) => (
                              <FormField
                                key={dealbreaker}
                                control={form.control}
                                name="dealbreakers"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={dealbreaker}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={(field.value || []).includes(dealbreaker)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), dealbreaker])
                                              : field.onChange(
                                                  (field.value || []).filter(
                                                    (value) => value !== dealbreaker
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel>
                                        {dealbreaker}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {step === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="communicationStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How would you describe your communication style in relationships?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              className="flex flex-col space-y-1"
                            >
                              {[
                                "Direct and straightforward",
                                "Diplomatic and gentle",
                                "Actions more than words",
                                "Expressive and open"
                              ].map((style) => (
                                <FormItem key={style} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={style} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {style}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="conflictResolution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How do you typically handle disagreements in relationships?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              className="flex flex-col space-y-1"
                            >
                              {[
                                "Address issues immediately and directly",
                                "Take time to process before discussing",
                                "Prefer to compromise and find middle ground",
                                "Focus on understanding the other person's perspective first"
                              ].map((style) => (
                                <FormItem key={style} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={style} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {style}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="loveLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How do you primarily express affection in relationships?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              className="flex flex-col space-y-1"
                            >
                              {[
                                "Quality time together",
                                "Acts of service",
                                "Physical touch",
                                "Verbal affirmation and compliments",
                                "Thoughtful gifts"
                              ].map((language) => (
                                <FormItem key={language} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={language} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {language}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="relationshipPace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What's your preferred pace when developing a new relationship?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              className="flex flex-col space-y-1"
                            >
                              {[
                                "Taking things slowly and building friendship first",
                                "Moderate pace with regular communication",
                                "Diving deep quickly to establish emotional connection",
                                "Following intuition rather than a set timeline"
                              ].map((pace) => (
                                <FormItem key={pace} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={pace} />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {pace}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="photoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Photo URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter URL to your profile photo" 
                              value={field.value || ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription>
                            Your photo will only be revealed to matches after 3 audio calls
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => {
                        const [dialogOpen, setDialogOpen] = useState(false);
                        
                        return (
                          <FormItem>
                            <FormLabel>Choose Avatar Emoji</FormLabel>
                            <div className="flex items-center gap-4">
                              <div 
                                className="cursor-pointer"
                                onClick={() => setDialogOpen(true)}
                              >
                                <AvatarPlaceholder 
                                  user={{ ...user, avatar: field.value }} 
                                  size="lg"
                                  selectable={true}
                                  onSelectAvatar={() => setDialogOpen(true)}
                                />
                              </div>
                              <div className="flex-1">
                                <FormDescription>
                                  Select an emoji avatar that represents your personality
                                </FormDescription>
                              </div>
                            </div>
                            
                            <AvatarSelector
                              open={dialogOpen}
                              onOpenChange={setDialogOpen}
                              currentAvatar={field.value || ""}
                              onSelect={(emoji) => {
                                field.onChange(emoji);
                                setDialogOpen(false);
                              }}
                            />
                            
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </>
                )}
                
                <div className="flex justify-between pt-4">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                    >
                      Previous
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/home")}
                    >
                      Cancel
                    </Button>
                  )}
                  
                  <Button 
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : step < totalSteps ? (
                      "Next"
                    ) : (
                      "Save Profile"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
      <MobileNav activeTab="profile" />
    </div>
  );
}
