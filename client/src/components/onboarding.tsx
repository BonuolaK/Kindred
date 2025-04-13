import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Logo from "@/components/logo";
import { Loader2, ArrowRight, ArrowLeft, Check, CalendarIcon, Upload, X } from "lucide-react";
import { ukCities } from "@/lib/uk-cities";
import { motion, AnimatePresence } from "framer-motion";
import AvatarSelector from "@/components/avatar-selector";
import AvatarPlaceholder from "@/components/avatar-placeholder";
import { cn } from "@/lib/utils";

// Steps for the onboarding process
type Step = {
  id: number;
  title: string;
  description: string;
  question?: string;
  fieldName?: string;
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
    description: "Tell us about yourself",
    question: "What's your name?",
    fieldName: "name",
  },
  {
    id: 3,
    title: "Date of Birth",
    description: "We need to verify you're 21+",
    question: "What's your date of birth?",
    fieldName: "dateOfBirth",
  },
  {
    id: 4,
    title: "ID Verification",
    description: "Only verified users can make and receive calls",
    question: "Please upload a photo of your ID to verify your age",
    fieldName: "idVerificationImage",
  },
  {
    id: 5,
    title: "Choose Your Avatar",
    description: "Select an avatar to represent you",
    question: "Choose an avatar emoji",
    fieldName: "avatar",
  },
  {
    id: 6,
    title: "Basic Information",
    description: "Tell us about yourself",
    question: "What's your gender?",
    fieldName: "gender",
  },
  {
    id: 7,
    title: "Basic Information",
    description: "Tell us about yourself",
    question: "Who are you interested in meeting?",
    fieldName: "interestedGenders",
  },
  {
    id: 8,
    title: "Age Preferences",
    description: "What age range are you looking to match with?",
    question: "Select your preferred age range:",
    fieldName: "agePreference",
  },
  {
    id: 9,
    title: "Location",
    description: "Where are you based?",
    question: "Which city do you live in?",
    fieldName: "location",
  },
  {
    id: 10,
    title: "About You",
    description: "Let others know a bit more about you",
    question: "Write a short bio about yourself",
    fieldName: "bio",
  },
  {
    id: 11,
    title: "Communication",
    description: "Help us understand your communication style",
    question: "How would you describe your communication style?",
    fieldName: "communicationStyle",
  },
  {
    id: 12,
    title: "Interests",
    description: "What do you enjoy doing in your free time?",
    question: "Select activities you enjoy",
    fieldName: "freeTimeActivities",
  },
  {
    id: 13,
    title: "Values",
    description: "What's important to you in relationships?",
    question: "What values are most important to you?",
    fieldName: "values",
  },
  {
    id: 14,
    title: "Conflict Resolution",
    description: "How do you handle disagreements?",
    question: "How do you typically resolve conflicts?",
    fieldName: "conflictResolution",
  },
  {
    id: 15,
    title: "Love Language",
    description: "How do you express and receive love?",
    question: "What's your primary love language?",
    fieldName: "loveLanguage",
  },
  {
    id: 16,
    title: "Relationship Pace",
    description: "Everyone moves at their own pace",
    question: "How would you describe your ideal relationship pace?",
    fieldName: "relationshipPace",
  },
  {
    id: 17,
    title: "Deal Breakers",
    description: "What's absolutely non-negotiable for you?",
    question: "Select your deal breakers",
    fieldName: "dealbreakers",
  },
  {
    id: 18,
    title: "All Done!",
    description: "Your profile is ready to go",
  },
];

// Basic validation schema
const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  age: z.number().min(21, "You must be at least 21 years old to use Kindred").max(120),
  gender: z.string().min(1, "Please select your gender"),
  interestedGenders: z.array(z.string()).min(1, "Please select at least one gender"),
  agePreferenceMin: z.number().min(21, "Minimum age must be at least 21").max(120).optional(),
  agePreferenceMax: z.number().min(21, "Maximum age must be at least 21").max(120).optional(),
  location: z.string().min(1, "Please select your location"),
  bio: z.string().optional(),
  communicationStyle: z.string().optional(),
  freeTimeActivities: z.array(z.string()).optional(),
  values: z.string().optional(),
  conflictResolution: z.string().optional(),
  loveLanguage: z.string().optional(),
  relationshipPace: z.string().optional(),
  dealbreakers: z.array(z.string()).optional(),
  avatar: z.string().optional(),
  idVerificationImage: z.string().optional(),
  idVerificationSkipped: z.boolean().optional(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type OnboardingProps = {
  onComplete: () => void;
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { user, updateProfileMutation } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  
  // Form with defaults from user if available
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: user?.name || "",
      dateOfBirth: user?.dateOfBirth || "",
      age: user?.age || undefined,
      gender: user?.gender || "",
      interestedGenders: user?.interestedGenders || [],
      agePreferenceMin: user?.agePreferenceMin || undefined,
      agePreferenceMax: user?.agePreferenceMax || undefined,
      location: user?.location || "",
      bio: user?.bio || "",
      communicationStyle: user?.communicationStyle || "",
      freeTimeActivities: user?.freeTimeActivities || [],
      values: user?.values || "",
      conflictResolution: user?.conflictResolution || "",
      loveLanguage: user?.loveLanguage || "",
      relationshipPace: user?.relationshipPace || "",
      dealbreakers: user?.dealbreakers || [],
      avatar: user?.avatar || "",
      idVerificationImage: user?.idVerificationImage || "",
      idVerificationSkipped: user?.idVerificationSkipped || false,
    },
  });
  
  const handleNext = async () => {
    // Validate the current field if applicable
    const currentStepData = steps[currentStep - 1];
    const fieldName = currentStepData.fieldName;
    
    // If this step has a field to validate
    if (fieldName) {
      const result = await form.trigger(fieldName as any);
      if (!result) return;
    }
    
    if (currentStep < steps.length) {
      setDirection("forward");
      setCurrentStep(currentStep + 1);
    } else {
      // Submit the form on the last step
      onSubmit(form.getValues());
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setDirection("backward");
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
            </div>
            <CardDescription>{currentStepData.description}</CardDescription>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full mt-4">
              <motion.div 
                className="bg-primary h-full rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentStep}
                    initial={{ 
                      x: direction === "forward" ? 20 : -20, 
                      opacity: 0 
                    }}
                    animate={{ 
                      x: 0, 
                      opacity: 1 
                    }}
                    exit={{ 
                      x: direction === "forward" ? -20 : 20, 
                      opacity: 0 
                    }}
                    transition={{ duration: 0.3 }}
                    className="min-h-[300px] flex flex-col"
                  >
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
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Your full name" 
                                  {...field} 
                                  className="text-lg mt-4"
                                />
                              </FormControl>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 3 && (
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>
                                You must be at least 21 years old to use Kindred
                              </FormDescription>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal mt-4",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(new Date(field.value), "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <div className="flex flex-col space-y-4 p-2">
                                    <div className="flex justify-between pb-2">
                                      <Select
                                        onValueChange={(value) => {
                                          const year = parseInt(value);
                                          const currentDate = field.value ? new Date(field.value) : new Date();
                                          currentDate.setFullYear(year);
                                          
                                          // Update month view to January of the selected year
                                          const calendarApi = document.querySelector('.rdp');
                                          if (calendarApi) {
                                            const januaryOfYear = new Date(year, 0, 1);
                                            // Reset to January of the selected year
                                            field.onChange(januaryOfYear.toISOString());
                                          } else {
                                            field.onChange(currentDate.toISOString());
                                          }
                                        }}
                                        value={field.value 
                                          ? new Date(field.value).getFullYear().toString() 
                                          : (new Date().getFullYear() - 21).toString()}
                                      >
                                        <SelectTrigger className="w-[120px]">
                                          <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from({ length: 80 }, (_, i) => {
                                            const year = new Date().getFullYear() - 21 - i;
                                            return (
                                              <SelectItem key={year} value={year.toString()}>
                                                {year}
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <Calendar
                                      mode="single"
                                      month={field.value ? new Date(field.value) : undefined}
                                      selected={field.value ? new Date(field.value) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          const today = new Date();
                                          const birthDate = new Date(date);
                                          const age = today.getFullYear() - birthDate.getFullYear();
                                          
                                          // Check if birthday has occurred this year
                                          const hasBirthdayOccurred = 
                                            today.getMonth() > birthDate.getMonth() || 
                                            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
                                          
                                          const calculatedAge = hasBirthdayOccurred ? age : age - 1;
                                          
                                          field.onChange(date.toISOString());
                                          
                                          // Update the age field
                                          form.setValue("age", calculatedAge);
                                        } else {
                                          field.onChange("");
                                        }
                                      }}
                                      disabled={(date) => {
                                        // Disable dates less than 21 years ago
                                        const twentyOneYearsAgo = new Date();
                                        twentyOneYearsAgo.setFullYear(twentyOneYearsAgo.getFullYear() - 21);
                                        return date > new Date() || date > twentyOneYearsAgo;
                                      }}
                                      initialFocus
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 4 && (
                      <div className="flex-1 flex flex-col justify-center">
                        <motion.div 
                          initial={{ y: 10, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                          <FormDescription>
                            ID verification is required to make and receive calls on Kindred. We take your privacy seriously and only use this to verify your age.
                          </FormDescription>
                          
                          <div className="mt-6 flex flex-col items-center gap-4">
                            <FormField
                              control={form.control}
                              name="idVerificationImage"
                              render={({ field }) => (
                                <FormItem className="w-full">
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    {field.value ? (
                                      <div className="flex flex-col items-center justify-center">
                                        <div className="bg-green-100 text-green-800 p-3 rounded-full mb-2">
                                          <Check className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm mb-2">ID uploaded successfully</p>
                                        <Button 
                                          variant="destructive" 
                                          size="sm"
                                          onClick={() => field.onChange("")}
                                        >
                                          <X className="h-4 w-4 mr-2" />
                                          Remove
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center">
                                        <div className="bg-primary/10 p-3 rounded-full mb-2">
                                          <Upload className="h-6 w-6 text-primary" />
                                        </div>
                                        <p className="text-sm mb-2">Click to upload or drag and drop</p>
                                        <p className="text-xs text-gray-500 mb-4">ID card, passport or driver's license</p>
                                        <Button
                                          type="button"
                                          onClick={() => {
                                            // In a real app, this would trigger a file upload
                                            // For now, we'll just set a placeholder value
                                            field.onChange("id-verification-image-placeholder");
                                          }}
                                        >
                                          Upload ID
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-center items-center w-full">
                              <div className="h-px w-full bg-gray-200"></div>
                              <span className="px-4 text-gray-500 text-sm">OR</span>
                              <div className="h-px w-full bg-gray-200"></div>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="idVerificationSkipped"
                              render={({ field }) => (
                                <FormItem className="w-full">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                      field.onChange(true);
                                      handleNext();
                                    }}
                                  >
                                    Skip for now (you'll need to verify later to make calls)
                                  </Button>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </motion.div>
                      </div>
                    )}
                    
                    {currentStep === 5 && (
                      <FormField
                        control={form.control}
                        name="avatar"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>
                                This emoji will represent you until you choose to reveal your photo
                              </FormDescription>
                              
                              <div className="mt-8 flex flex-col items-center">
                                <div className="mb-6">
                                  <AvatarPlaceholder 
                                    size="xl" 
                                    name={form.getValues().name} 
                                    user={{ avatar: field.value }} 
                                  />
                                </div>
                                
                                <div className="w-full max-w-md">
                                  <AvatarSelector
                                    open={true}
                                    onOpenChange={() => {}}
                                    onSelect={(emoji) => {
                                      field.onChange(emoji);
                                    }}
                                    currentAvatar={field.value}
                                  />
                                </div>
                              </div>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 6 && (
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value || ''}
                                  className="flex flex-col space-y-3 mt-4"
                                >
                                  {["Woman", "Man", "Non-binary", "Other"].map((gender) => (
                                    <FormItem key={gender} className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value={gender} />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {gender}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 7 && (
                      <FormField
                        control={form.control}
                        name="interestedGenders"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>Select all that apply</FormDescription>
                              <div className="grid grid-cols-1 gap-4 mt-4">
                                {["Women", "Men", "Non-binary", "Other"].map((gender) => (
                                  <FormItem 
                                    key={gender} 
                                    className="flex items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox 
                                        checked={field.value?.includes(gender)} 
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...(field.value || []), gender]);
                                          } else {
                                            field.onChange(field.value?.filter((value) => value !== gender));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {gender}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </div>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 8 && (
                      <div className="flex-1 flex flex-col justify-center">
                        <motion.div 
                          initial={{ y: 10, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <FormLabel className="text-xl font-heading mb-4">{currentStepData.question}</FormLabel>
                          <div className="grid grid-cols-2 gap-6 mt-4">
                            <FormField
                              control={form.control}
                              name="agePreferenceMin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Minimum Age</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Min age"
                                      min={21}
                                      max={100}
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
                              name="agePreferenceMax"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Maximum Age</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Max age"
                                      min={21}
                                      max={100}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </motion.div>
                      </div>
                    )}
                    
                    {currentStep === 9 && (
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <SelectTrigger className="mt-4">
                                    <SelectValue placeholder="Select your city" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ukCities.map((city) => (
                                      <SelectItem key={city} value={city}>
                                        {city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 10 && (
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>
                                Tell potential matches about yourself, your interests, and what you're looking for
                              </FormDescription>
                              <FormControl>
                                <Textarea 
                                  placeholder="I'm a..." 
                                  {...field} 
                                  className="mt-4 min-h-[150px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 11 && (
                      <FormField
                        control={form.control}
                        name="communicationStyle"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value || ''}
                                  className="flex flex-col space-y-3 mt-4"
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
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 12 && (
                      <FormField
                        control={form.control}
                        name="conflictResolution"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value || ''}
                                  className="flex flex-col space-y-3 mt-4"
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
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 13 && (
                      <FormField
                        control={form.control}
                        name="loveLanguage"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value || ''}
                                  className="flex flex-col space-y-3 mt-4"
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
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 14 && (
                      <FormField
                        control={form.control}
                        name="relationshipPace"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value || ''}
                                  className="flex flex-col space-y-3 mt-4"
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
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 15 && (
                      <FormField
                        control={form.control}
                        name="dealbreakers"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>Select all that apply</FormDescription>
                              <div className="grid grid-cols-1 gap-4 mt-4">
                                {[
                                  "Different lifestyle habits",
                                  "Misaligned future goals",
                                  "Incompatible financial attitudes",
                                  "Different social needs",
                                  "Conflicting values or beliefs"
                                ].map((dealbreaker) => (
                                  <FormItem 
                                    key={dealbreaker} 
                                    className="flex items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox 
                                        checked={(field.value || []).includes(dealbreaker)} 
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...(field.value || []), dealbreaker]);
                                          } else {
                                            field.onChange((field.value || []).filter((value) => value !== dealbreaker));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {dealbreaker}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </div>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 16 && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }} 
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, duration: 0.5 }}
                          className="bg-primary/10 rounded-full p-4 mb-6"
                        >
                          <Check className="w-12 h-12 text-primary" />
                        </motion.div>
                        <h3 className="text-2xl font-heading font-semibold mb-4">Profile Complete!</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Thanks for taking the time to fill out your profile. We'll use this information to find your most compatible matches.
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                
                <div className="flex justify-between pt-4">
                  {currentStep > 1 ? (
                    <Button 
                      type="button" 
                      onClick={handlePrevious}
                      variant="outline"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  ) : (
                    <div></div> // Empty div to maintain flex layout
                  )}
                  
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    disabled={updateProfileMutation.isPending}
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
                      "Get Started"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}