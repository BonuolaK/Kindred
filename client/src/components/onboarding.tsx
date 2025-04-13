import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { callPreferencesSchema } from "@shared/schema";
import { format } from "date-fns";
import { useToast, toast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Check,
  X,
  Upload,
  CalendarIcon,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronUp
} from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import Logo from "@/components/logo";
import { ukCities } from "@/lib/uk-cities";
import { motion, AnimatePresence } from "framer-motion";
import AvatarSelector from "@/components/avatar-selector";
import AvatarPlaceholder from "@/components/avatar-placeholder";
import { CallPreferencesEditor } from "@/components/call-preferences-editor";
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
    question: "What's your username?",
    fieldName: "username",
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
    title: "Preferred Call Times",
    description: "Set your preferred times for audio calls",
    question: "When are you typically available for calls?",
    fieldName: "callPreferences",
  },
  {
    id: 19,
    title: "Profile Complete!",
    description: "Thanks for taking the time to fill out your profile",
  },
];

// Basic validation schema
const onboardingSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").min(1, "Username is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  age: z.number().min(21, "You must be at least 21 years old to use Kindred").max(120),
  gender: z.string().min(1, "Please select your gender"),
  interestedGenders: z.array(z.string()).min(1, "Please select at least one gender"),
  agePreferenceMin: z.number().min(21, "Minimum age must be at least 21").max(120).optional(),
  agePreferenceMax: z.number().min(21, "Maximum age must be at least 21").max(120).optional(),
  location: z.string().min(1, "Please select your location"),
  bio: z.string().min(1, "Bio is required"),
  communicationStyle: z.string().optional(),
  freeTimeActivities: z.array(z.string()).min(1, "Please select at least one activity"),
  values: z.string().min(1, "Please select your values"),
  conflictResolution: z.string().min(1, "Please select your conflict resolution style"),
  loveLanguage: z.string().min(1, "Please select your love language"),
  relationshipPace: z.string().min(1, "Please select your relationship pace"),
  dealbreakers: z.array(z.string()).min(1, "Please select at least one dealbreaker"),
  callPreferences: callPreferencesSchema.optional(),
  avatar: z.string().optional(),
  idVerificationImage: z.string().optional(),
  idVerificationSkipped: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type OnboardingProps = {
  onComplete: () => void;
  initialStep?: number;
};

export default function Onboarding({ onComplete, initialStep = 1 }: OnboardingProps) {
  const { user, updateProfileMutation } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  
  // Form with defaults from user if available
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: user?.username || "",
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
      callPreferences: user?.callPreferences || {
        weekdays: [],
        weekends: [],
        notAvailable: []
      },
      avatar: user?.avatar || "",
      idVerificationImage: user?.idVerificationImage || "",
      idVerificationSkipped: user?.idVerificationSkipped || false,
      onboardingCompleted: false,
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
    
    // Save current field progress immediately for each step, but don't complete onboarding yet
    if (fieldName && currentStep !== steps.length) {
      // Get current form data and save the current field update
      const currentFormData = form.getValues();
      
      // Keep onboardingCompleted flag as false until final step
      const formDataForUpdate = {
        ...currentFormData,
        onboardingCompleted: false
      };
      
      // Update only what's changed (the current field)
      updateProfileMutation.mutate(formDataForUpdate);
    }
    
    // Check if completing the final step
    if (currentStep === steps.length) {
      // Submit the form on the last step - this will mark onboarding as complete
      onSubmit(form.getValues());
    } else if (currentStep === 18) { // After completing the call preferences step
      // This is the last substantive step (before the final "completed" message)
      const currentFormData = form.getValues();
      const requiredFieldsFilled = 
        currentFormData.username && 
        currentFormData.gender && 
        currentFormData.interestedGenders?.length > 0 && 
        currentFormData.age >= 21 && 
        currentFormData.bio && 
        currentFormData.location && 
        currentFormData.freeTimeActivities?.length > 0 &&
        currentFormData.values && 
        currentFormData.conflictResolution && 
        currentFormData.loveLanguage && 
        currentFormData.relationshipPace && 
        currentFormData.dealbreakers?.length > 0;
        
      if (requiredFieldsFilled) {
        // All required fields are filled, mark onboarding as complete
        const formDataWithCompletionFlag = {
          ...currentFormData,
          onboardingCompleted: true as boolean
        };
        
        updateProfileMutation.mutate(formDataWithCompletionFlag, {
          onSuccess: () => {
            // Move to the last step to show completion message
            setCurrentStep(steps.length);
            setTimeout(() => onComplete(), 2000); // Show completion message for 2 seconds before completing
          }
        });
      } else {
        // Move to next step without marking onboarding as complete
        setDirection("forward");
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Regular step progression for all other steps
      setDirection("forward");
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setDirection("backward");
      setCurrentStep(currentStep - 1);
    }
  };
  
  const onSubmit = (data: OnboardingFormValues) => {
    // Check if all required fields are filled
    const requiredFieldsFilled = 
      data.username && 
      data.gender && 
      data.interestedGenders?.length > 0 && 
      data.age >= 21 && 
      data.bio && 
      data.location && 
      data.freeTimeActivities?.length > 0 &&
      data.values && 
      data.conflictResolution && 
      data.loveLanguage && 
      data.relationshipPace && 
      data.dealbreakers?.length > 0;
      
    // This is called on the final page, so mark onboarding as complete
    // if all required fields are filled, but always save the call preferences
    const formDataWithCompletionFlag = {
      ...data,
      onboardingCompleted: requiredFieldsFilled as boolean
    };
    
    updateProfileMutation.mutate(formDataWithCompletionFlag, {
      onSuccess: () => {
        // Only complete onboarding if all required fields are filled
        if (requiredFieldsFilled) {
          onComplete();
        } else {
          // Otherwise, save the call preferences but keep the user in onboarding
          toast({
            title: "Call preferences saved",
            description: "Your call preferences have been updated, but you still need to complete all required fields.",
          });
        }
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
                        name="username"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>
                                Choose a username that doesn't reveal your real name – this keeps your identity private and prevents people from finding you on social media.
                              </FormDescription>
                              <FormControl>
                                <Input 
                                  placeholder="Enter a username" 
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
                                  {(() => {
                                    // Use separate local state for year, month selection
                                    const [selectedYear, setSelectedYear] = useState(
                                      field.value ? new Date(field.value).getFullYear() : new Date().getFullYear() - 21
                                    );
                                    const [viewMode, setViewMode] = useState<'year' | 'date'>('year');
                                    
                                    // Calculate year range (1900 to current year-21)
                                    const currentYear = new Date().getFullYear();
                                    const startYear = 1900;
                                    const endYear = currentYear - 21;
                                    const numYears = endYear - startYear + 1;
                                    
                                    // Function to handle year selection
                                    const handleYearSelect = (year: number) => {
                                      setSelectedYear(year);
                                      
                                      // Create a date with the selected year (Jan 1st)
                                      const newDate = new Date(year, 0, 1);
                                      field.onChange(newDate.toISOString());
                                      
                                      // Update the current month view to match the selected year
                                      setCurrentMonth(newDate);
                                      
                                      // Switch to date selection
                                      setViewMode('date');
                                    };
                                    
                                    // Pagination for year selection
                                    const [yearPage, setYearPage] = useState(0);
                                    const yearsPerPage = 24; // 4 columns x 6 rows
                                    const totalPages = Math.ceil(numYears / yearsPerPage);
                                    
                                    // Get years for current page (most recent first)
                                    const getPageYears = (page: number) => {
                                      const startIdx = page * yearsPerPage;
                                      const years = [];
                                      for (let i = 0; i < yearsPerPage; i++) {
                                        const yearIndex = startIdx + i;
                                        if (yearIndex < numYears) {
                                          years.push(endYear - yearIndex);
                                        }
                                      }
                                      return years;
                                    };
                                    
                                    // Render the year selection grid with pagination
                                    const renderYearSelection = () => {
                                      const years = getPageYears(yearPage);
                                      
                                      return (
                                        <div className="p-3 w-[300px]">
                                          <div className="mb-2 flex items-center justify-between">
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              disabled={yearPage === 0}
                                              onClick={() => setYearPage(p => Math.max(0, p - 1))}
                                            >
                                              <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <div className="font-semibold text-center">
                                              Select Year ({years[years.length-1] || endYear}-{years[0] || startYear})
                                            </div>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              disabled={yearPage >= totalPages - 1}
                                              onClick={() => setYearPage(p => Math.min(totalPages - 1, p + 1))}
                                            >
                                              <ArrowRight className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          
                                          <div className="grid grid-cols-4 gap-2">
                                            {years.map(year => (
                                              <Button
                                                key={year}
                                                variant={year === selectedYear ? "default" : "outline"}
                                                className="h-10"
                                                onClick={() => handleYearSelect(year)}
                                              >
                                                {year}
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    };
                                    
                                    // State for the date picker
                                    const [currentMonth, setCurrentMonth] = useState<Date>(() => 
                                      field.value ? new Date(field.value) : new Date(selectedYear, 0, 1)
                                    );
                                    
                                    // Render the calendar for date selection
                                    const renderDateSelection = () => {
                                      return (
                                        <div className="flex flex-col space-y-2 p-2">
                                          <div className="flex items-center justify-between">
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => setViewMode('year')}
                                            >
                                              <ChevronLeft className="mr-1 h-4 w-4" />
                                              Back to Years
                                            </Button>
                                            <div className="font-medium">
                                              {selectedYear}
                                            </div>
                                          </div>
                                          
                                          <Calendar
                                            mode="single"
                                            month={currentMonth}
                                            onMonthChange={setCurrentMonth}
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
                                                
                                                // Update field value
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
                                      );
                                    };
                                    
                                    return viewMode === 'year' ? renderYearSelection() : renderDateSelection();
                                  })()}
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
                            ID verification is required to make and receive calls on Kindred. We take your privacy seriously and only use this to verify your details. You'll need to verify later to make calls if you skip this step.
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
                                    Skip
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
                                    name={form.getValues().username} 
                                    user={{ avatar: field.value }} 
                                  />
                                </div>
                                
                                <div className="w-full max-w-md">
                                  {(() => {
                                    const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(true);
                                    
                                    return (
                                      <>
                                        <AvatarSelector
                                          open={avatarSelectorOpen}
                                          onOpenChange={setAvatarSelectorOpen}
                                          onSelect={(emoji) => {
                                            field.onChange(emoji);
                                            // After selecting, wait a moment and proceed to next step
                                            setTimeout(() => {
                                              handleNext();
                                            }, 500);
                                          }}
                                          currentAvatar={field.value}
                                        />
                                        
                                        {!avatarSelectorOpen && (
                                          <Button 
                                            className="mt-4"
                                            onClick={() => setAvatarSelectorOpen(true)}
                                          >
                                            Choose Different Avatar
                                          </Button>
                                        )}
                                      </>
                                    );
                                  })()}
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
                                  <Select
                                    onValueChange={(value) => {
                                      const numValue = parseInt(value);
                                      field.onChange(numValue);
                                      
                                      // Ensure max age is not less than min age
                                      const currentMax = form.getValues("agePreferenceMax");
                                      if (currentMax && numValue > currentMax) {
                                        form.setValue("agePreferenceMax", numValue);
                                      }
                                    }}
                                    defaultValue={field.value?.toString() || "21"}
                                    value={field.value?.toString() || "21"}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select minimum age" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 80 }, (_, i) => i + 21).map((age) => (
                                        <SelectItem key={age} value={age.toString()}>
                                          {age}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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
                                  <Select
                                    onValueChange={(value) => {
                                      const numValue = parseInt(value);
                                      field.onChange(numValue);
                                      
                                      // Ensure min age is not greater than max age
                                      const currentMin = form.getValues("agePreferenceMin");
                                      if (currentMin && numValue < currentMin) {
                                        form.setValue("agePreferenceMin", numValue);
                                      }
                                    }}
                                    defaultValue={field.value?.toString() || "100"}
                                    value={field.value?.toString() || "100"}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select maximum age" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Array.from({ length: 80 }, (_, i) => i + 21).map((age) => (
                                        <SelectItem key={age} value={age.toString()}>
                                          {age}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Maximum age must be greater than or equal to minimum age
                                  </FormDescription>
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
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between mt-4"
                                    >
                                      {field.value || "Select your city"}
                                      <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search for a city..." className="h-9" />
                                      <CommandEmpty>No city found.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandList>
                                          {ukCities.map((city) => (
                                            <CommandItem
                                              key={city}
                                              value={city}
                                              onSelect={() => {
                                                field.onChange(city);
                                              }}
                                              className="cursor-pointer"
                                            >
                                              {city}
                                              {field.value === city && (
                                                <Check className="ml-auto h-4 w-4" />
                                              )}
                                            </CommandItem>
                                          ))}
                                        </CommandList>
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
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
                                  onValueChange={(value: string) => field.onChange(value)}
                                  value={typeof field.value === 'string' ? field.value : ''}
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
                        name="freeTimeActivities"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-1 gap-4 mt-4">
                                  {[
                                    "Outdoor activities and nature",
                                    "Reading and learning new things",
                                    "Socializing with friends and family", 
                                    "Arts, music, and creative hobbies",
                                    "Sports and fitness",
                                    "Movies, TV shows, and entertainment"
                                  ].map((activity) => (
                                    <FormItem 
                                      key={activity} 
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox 
                                          checked={(field.value || []).includes(activity)} 
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...(field.value || []), activity]);
                                            } else {
                                              field.onChange((field.value || []).filter((value) => value !== activity));
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {activity}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                </div>
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
                        name="values"
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
                                  onValueChange={(value: string) => field.onChange(value)}
                                  value={typeof field.value === 'string' ? field.value : ''}
                                  className="flex flex-col space-y-3 mt-4"
                                >
                                  {[
                                    "Honesty and trust",
                                    "Respect and equality",
                                    "Growth and personal development",
                                    "Independence and freedom",
                                    "Loyalty and commitment"
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
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 14 && (
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
                                  onValueChange={(value: string) => field.onChange(value)}
                                  value={typeof field.value === 'string' ? field.value : ''}
                                  className="flex flex-col space-y-3 mt-4"
                                >
                                  {[
                                    "Address issues immediately with direct communication",
                                    "Take time to process before discussing calmly",
                                    "Seek compromise and middle ground",
                                    "Listen first, then share my perspective",
                                    "Prefer to move on quickly without dwelling on issues"
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
                    
                    {currentStep === 15 && (
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
                                  onValueChange={(value: string) => field.onChange(value)}
                                  value={typeof field.value === 'string' ? field.value : ''}
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

                    {currentStep === 16 && (
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
                                  onValueChange={(value: string) => field.onChange(value)}
                                  value={typeof field.value === 'string' ? field.value : ''}
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
                    
                    {currentStep === 17 && (
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
                    
                    {currentStep === 18 && (
                      <FormField
                        control={form.control}
                        name="callPreferences"
                        render={({ field }) => (
                          <FormItem className="flex-1 flex flex-col justify-center">
                            <motion.div 
                              initial={{ y: 10, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <FormLabel className="text-xl font-heading mb-2">{currentStepData.question}</FormLabel>
                              <FormDescription>
                                Setting your preferred call times helps matches schedule calls when you're available. You can skip this to show as "Flexible Timing – always available for calls".
                              </FormDescription>
                              <FormControl>
                                <CallPreferencesEditor 
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="mt-4"
                                />
                              </FormControl>
                              
                              <div className="flex justify-center mt-6">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    // Set default flexible timing
                                    const flexibleSchedule = {
                                      weekdays: [],
                                      weekends: [],
                                      notAvailable: []
                                    };
                                    
                                    // Update the field
                                    field.onChange(flexibleSchedule);
                                    
                                    // Save the current form data
                                    const currentData = form.getValues();
                                    updateProfileMutation.mutate({
                                      ...currentData,
                                      callPreferences: flexibleSchedule,
                                      onboardingCompleted: false
                                    }, {
                                      onSuccess: () => {
                                        toast({
                                          title: "Call preferences saved",
                                          description: "Flexible timing preferences have been saved.",
                                        });
                                        handleNext();
                                      }
                                    });
                                  }}
                                >
                                  Skip (Flexible Timing)
                                </Button>
                              </div>
                              <FormMessage />
                            </motion.div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {currentStep === 19 && (
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
                  <div className="flex gap-2">
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
                      <Button
                        type="button"
                        onClick={() => window.history.back()}
                        variant="outline"
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    
                    {/* Exit button to save current progress and return to profile */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        // Save current progress without marking onboarding as complete
                        const currentData = form.getValues();
                        updateProfileMutation.mutate(currentData, {
                          onSuccess: () => {
                            toast({
                              title: "Progress saved",
                              description: "Your profile updates have been saved.",
                            });
                            // Return to profile page
                            onComplete();
                          }
                        });
                      }}
                      disabled={updateProfileMutation.isPending}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Exit & Save
                    </Button>
                  </div>
                  
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