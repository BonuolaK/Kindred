import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import Footer from "@/components/footer";
import { Heart, Link, PhoneCall, MessageCircle, Clock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/home");
    }
  }, [user, isLoading, navigate]);
  
  // Track page view when component mounts
  useEffect(() => {
    trackEvent('view_landing_page', { 
      source: 'landing',
      timestamp: new Date().toISOString()
    });
  }, []);

  const handleGetStarted = () => {
    // Track sign up click event
    trackEvent('click_sign_up', { 
      source: 'landing_page', 
      button: 'get_started',
      timestamp: new Date().toISOString()
    });
    navigate("/auth");
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="relative z-10">
        <nav className="bg-white shadow-sm py-3">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center">
              <Logo />
              <span className="ml-2 text-gray-800 font-heading font-semibold text-xl">Kindred</span>
            </div>
            <div className="hidden md:flex space-x-6">
              <a href="#how-it-works" className="text-gray-600 hover:text-primary">How It Works</a>
              <a href="#features" className="text-gray-600 hover:text-primary">Features</a>
              <a href="#about" className="text-gray-600 hover:text-primary">About</a>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="px-4 py-2 text-primary border-primary" 
                onClick={() => {
                  trackEvent('click_sign_in', { 
                    source: 'landing_page', 
                    location: 'header',
                    timestamp: new Date().toISOString()
                  });
                  navigate("/auth?tab=login");
                }}
              >
                Sign In
              </Button>
              <Button
                className="px-4 py-2 bg-primary hover:bg-primary/90"
                onClick={() => {
                  trackEvent('click_sign_up', { 
                    source: 'landing_page', 
                    location: 'header',
                    timestamp: new Date().toISOString()
                  });
                  navigate("/auth?tab=register");
                }}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-32">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl leading-tight text-gray-900 mb-6">
                Find Your <span className="text-primary">Kindred</span> Spirit Through Conversation
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed font-accent italic">
                "In a world of shallow swipes and filtered photos, we're reimagining connection. Kindred isn't about judging a book by its cover—it's about exploring the chapters that truly matter. We believe love is deeper than a perfect selfie, more nuanced than an algorithm's first impression."
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  size="lg"
                  className="px-8 py-4 bg-primary hover:bg-primary/90 rounded-xl text-lg"
                  onClick={handleGetStarted}
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 border-2 border-primary text-primary hover:bg-gray-100 rounded-xl text-lg"
                  onClick={() => {
                    trackEvent('click_learn_more', { 
                      source: 'landing_page', 
                      section: 'hero',
                      timestamp: new Date().toISOString()
                    });
                    document.getElementById('how-it-works')?.scrollIntoView({behavior: 'smooth'});
                  }}
                >
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-200 rounded-2xl overflow-hidden h-64 md:h-72 relative flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1516575334481-f85287c2c82d?w=600&auto=format&fit=crop&q=80" 
                    alt="Abstract connection visual" 
                    className="object-cover w-full h-full opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white font-medium text-lg">Discover</div>
                </div>
                
                <div className="bg-gray-200 rounded-2xl overflow-hidden h-72 md:h-80 relative flex items-center justify-center mt-6">
                  <img 
                    src="https://images.unsplash.com/photo-1553481187-be93c21490a9?w=600&auto=format&fit=crop&q=80" 
                    alt="Abstract connection visual" 
                    className="object-cover w-full h-full opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white font-medium text-lg">Connect</div>
                </div>
                
                <div className="bg-gray-200 rounded-2xl overflow-hidden h-72 md:h-80 relative flex items-center justify-center -mt-6">
                  <img 
                    src="https://images.unsplash.com/photo-1512531123205-560f5974e686?w=600&auto=format&fit=crop&q=80" 
                    alt="Abstract connection visual" 
                    className="object-cover w-full h-full opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white font-medium text-lg">Converse</div>
                </div>
                
                <div className="bg-gray-200 rounded-2xl overflow-hidden h-64 md:h-72 relative flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1517456215183-9a2c3a748f6c?w=600&auto=format&fit=crop&q=80" 
                    alt="Abstract connection visual" 
                    className="object-cover w-full h-full opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white font-medium text-lg">Connect</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gray-100 -skew-y-3 transform origin-bottom-right z-0"></div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-gray-900 mb-4">How Kindred Works</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">Our unique approach prioritizes meaningful conversation before physical appearance. Get to know someone through their thoughts and personality first.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-xl shadow-md p-8 text-center transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-4">Create Your Profile</h3>
              <p className="text-gray-600">Answer our thoughtful questionnaire to help our AI find your most compatible matches based on values, interests, and communication style.</p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white rounded-xl shadow-md p-8 text-center transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Link className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-4">Get Matched</h3>
              <p className="text-gray-600">Our algorithm pairs you with potential matches based on compatibility. You'll see abstract avatars - no photos until you've had meaningful conversations.</p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white rounded-xl shadow-md p-8 text-center transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <PhoneCall className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-4">Connect Through Conversation</h3>
              <p className="text-gray-600">Scheduled audio calls help you build connection gradually. Photos reveal only after you've had meaningful conversations.</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-lg text-primary-dark font-medium mb-6">Guided Audio Call Process</p>
            <div className="flex flex-col md:flex-row justify-center items-center md:space-x-6 space-y-6 md:space-y-0">
              {/* Day 1 */}
              <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-5 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-sm py-1 px-3 rounded-full">Day 1</div>
                <div className="text-center pt-2">
                  <div className="font-heading font-bold text-2xl mb-1">5 min</div>
                  <p className="text-gray-600 text-sm">First audio call</p>
                </div>
              </div>
              
              <div className="hidden md:block text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="block md:hidden text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              
              {/* Day 2 */}
              <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-5 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-sm py-1 px-3 rounded-full">Day 2</div>
                <div className="text-center pt-2">
                  <div className="font-heading font-bold text-2xl mb-1">10 min</div>
                  <p className="text-gray-600 text-sm">Second audio call</p>
                </div>
              </div>
              
              <div className="hidden md:block text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="block md:hidden text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              
              {/* Day 3 */}
              <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-5 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-sm py-1 px-3 rounded-full">Day 3</div>
                <div className="text-center pt-2">
                  <div className="font-heading font-bold text-2xl mb-1">20 min</div>
                  <p className="text-gray-600 text-sm">Photos revealed!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-gray-900 mb-4">Unique Features</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">Discover what makes Kindred different from other dating apps.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Side - Image */}
            <div className="relative">
              <div className="relative bg-gray-200 rounded-2xl overflow-hidden h-96 md:h-full">
                <img 
                  src="https://images.unsplash.com/photo-1581368135153-a506cf13531c?w=600&auto=format&fit=crop&q=80" 
                  alt="Audio call illustration" 
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/70 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                          T
                        </div>
                        <div className="ml-3">
                          <div className="font-heading font-semibold text-gray-900">Taylor</div>
                          <div className="text-sm text-gray-500">5:00 min call</div>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                            <path d="M5.5 9.643a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V9a6 6 0 1112 0v.643a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V9a3 3 0 00-6 0v.643z" />
                          </svg>
                        </button>
                        <button className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{width: '65%'}}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-gray-500">
                      <span>3:15</span>
                      <span>5:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Side - Feature List */}
            <div className="space-y-8">
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <PhoneCall className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-xl mb-2">Audio-First Connection</h3>
                  <p className="text-gray-600">Experience the power of voice. Audio calls create deeper connections than texting and let you get to know someone's authentic self.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-xl mb-2">Timed Conversations</h3>
                  <p className="text-gray-600">Our structured approach gradually increases call duration to build comfort and trust. No awkward goodbyes - the timer helps keep things natural.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-xl mb-2">Delayed Photo Reveal</h3>
                  <p className="text-gray-600">Connect with someone's personality first. Photos are revealed only after you've had meaningful conversations, creating connections based on compatibility rather than appearance.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-xl mb-2">Private Notes</h3>
                  <p className="text-gray-600">Take personal notes after each call to remember important details about your connection. These notes are private and help you track your feelings about the match.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-gray-900 mb-6">Ready to Make Meaningful Connections?</h2>
            <p className="text-xl text-gray-600 mb-10">Join Kindred and discover a new way to find your perfect match—beyond superficial judgments and filtered photos.</p>
            <Button 
              className="px-8 py-6 bg-primary hover:bg-primary/90 rounded-xl text-lg shadow-lg"
              onClick={handleGetStarted}
            >
              Create Your Free Account
            </Button>
            <p className="mt-6 text-gray-500">
              Already have an account? 
              <Button 
                variant="link" 
                className="text-primary font-medium"
                onClick={() => navigate("/auth?tab=login")}
              >
                Sign In
              </Button>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
