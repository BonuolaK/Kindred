import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Logo from "@/components/logo";
import { Loader2, ArrowRight } from "lucide-react";

// Steps for the onboarding process
type Step = {
  id: number;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    id: 1,
    title: "Welcome to Kindred",
    description: "Let's get to know you better to find meaningful connections",
  },
  {
    id: 2,
    title: "Basic Information",
    description: "Tell us about yourself and who you're looking to meet",
  },
  {
    id: 3,
    title: "Your Preferences",
    description: "Help us understand your relationship preferences",
  },
  {
    id: 4,
    title: "Almost Done!",
    description: "Just a few more questions about your communication style",
  },
];

// Basic validation schema
const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(18, "You must be at least 18 years old").max(120),
  gender: z.string().min(1, "Please select your gender"),
  interestedGenders: z.array(z.string()).min(1, "Please select at least one gender"),
  location: z.string().min(2, "Please enter your location"),
  job: z.string().optional(),
  bio: z.string().optional(),
  communicationStyle: z.string().optional(),
  freeTimeActivities: z.array(z.string()).optional(),
  values: z.string().optional(),
  conflictResolution: z.string().optional(),
  loveLanguage: z.string().optional(),
  relationshipPace: z.string().optional(),
  dealbreakers: z.array(z.string()).optional(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type OnboardingProps = {
  onComplete: () => void;
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { user, updateProfileMutation } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form with defaults from user if available
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: user?.name || "",
      age: user?.age || undefined,
      gender: user?.gender || "",
      interestedGenders: user?.interestedGenders || [],
      location: user?.location || "",
      job: user?.job || "",
      bio: user?.bio || "",
      communicationStyle: user?.communicationStyle || "",
      freeTimeActivities: user?.freeTimeActivities || [],
      values: user?.values || "",
      conflictResolution: user?.conflictResolution || "",
      loveLanguage: user?.loveLanguage || "",
      relationshipPace: user?.relationshipPace || "",
      dealbreakers: user?.dealbreakers || [],
    },
  });
  
  const handleNext = async () => {
    // Validate the current step
    const currentStepFields = getFieldsForStep(currentStep);
    const result = await form.trigger(currentStepFields as any);
    
    if (result) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit the form on the last step
        onSubmit(form.getValues());
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const onSubmit = (data: OnboardingFormValues) => {
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        onComplete();
      }
    });
  };
  
  // Determine which fields to show for each step
  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 1:
        return [];
      case 2:
        return ["name", "age", "gender", "interestedGenders"];
      case 3:
        return ["location", "job", "bio", "freeTimeActivities", "values"];
      case 4:
        return ["communicationStyle", "conflictResolution", "loveLanguage", "relationshipPace", "dealbreakers"];
      default:
        return [];
    }
  };
  
  const currentStepData = steps[currentStep - 1];
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl font-heading">{currentStepData.title}</CardTitle>
              <span className="text-sm text-gray-500">Step {currentStep} of {steps.length}</span>
            </div>
            <CardDescription>{currentStepData.description}</CardDescription>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full mt-4">
              <div 
                className="bg-primary h-full rounded-full transition-all" 
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                {currentStep === 1 && (
                  <div className="text-center py-8">
                    <h3 className="text-2xl font-heading font-semibold mb-4">Welcome to Kindred!</h3>
                    <p className="text-gray-600 mb-6">We're excited to help you find meaningful connections based on conversation first, appearance second.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-8">
                      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                          </svg>
                        </div>
                        <h4 className="font-heading font-semibold text-lg mb-2">Create Your Profile</h4>
                        <p className="text-gray-600 text-sm">Answer thoughtful questions to help our algorithm find your perfect matches.</p>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <path d="M2 13l10 10L22 13"></path>
                            <path d="M12 2v21"></path>
                          </svg>
                        </div>
                        <h4 className="font-heading font-semibold text-lg mb-2">Get Matched</h4>
                        <p className="text-gray-600 text-sm">Our algorithm pairs you with compatible matches. No photos until you've connected through conversation.</p>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <path d="M2 3a1 1 0 0 1 1-1h2.153a1 1 0 0 1 .986.836l.74 4.435a1 1 0 0 1-.54 1.06l-1.548.773a11.037 11.037 0 0 0 6.105 6.105l.774-1.548a1 1 0 0 1 1.059-.54l4.435.74a1 1 0 0 1 .836.986V17a1 1 0 0 1-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                          </svg>
                        </div>
                        <h4 className="font-heading font-semibold text-lg mb-2">Connect Through Calls</h4>
                        <p className="text-gray-600 text-sm">Scheduled audio calls help you build a genuine connection before revealing photos.</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">Let's get started by setting up your profile!</p>
                  </div>
                )}
                
                {currentStep === 2 && (
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
                              value={field.value || ""}
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
                  </>
                )}
                
                {currentStep === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="City, State/Province" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your location helps us find matches nearby
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="job"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Your job title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                              {...field} 
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
                      name="values"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Which of these values is most important to you in a relationship?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
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
                  </>
                )}
                
                {currentStep === 4 && (
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
                              defaultValue={field.value}
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
                      name="loveLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How do you primarily express affection in relationships?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
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
                              defaultValue={field.value}
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
                  </>
                )}
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              {currentStep === 1 ? 'Skip' : 'Previous'}
            </Button>
            
            <Button 
              type="button"
              onClick={handleNext}
              disabled={updateProfileMutation.isPending}
              className="ml-auto"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentStep < steps.length ? (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
