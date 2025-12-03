import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export function SplashScreen({ isVisible, onAnimationComplete }: SplashScreenProps) {
  console.log('[Frontend] [SplashScreen] Component render - isVisible:', isVisible);
  
  const [isAnimating, setIsAnimating] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  
  console.log('[Frontend] [SplashScreen] State - isAnimating:', isAnimating, 'shouldRender:', shouldRender);

  useEffect(() => {
    console.log('[Frontend] [SplashScreen] useEffect triggered - isVisible:', isVisible);
    
    if (!isVisible) {
      console.log('[Frontend] [SplashScreen] Hiding splash screen...');
      // Start fade out animation
      setIsAnimating(false);
      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        console.log('[Frontend] [SplashScreen] Removing splash screen from DOM');
        setShouldRender(false);
        onAnimationComplete?.();
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    } else {
      console.log('[Frontend] [SplashScreen] Showing splash screen...');
      // Show splash screen
      setShouldRender(true);
      // Small delay to ensure DOM is ready before starting animation
      const timer = setTimeout(() => {
        console.log('[Frontend] [SplashScreen] Starting splash animation');
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onAnimationComplete]);

  if (!shouldRender) {
    console.log('[Frontend] [SplashScreen] Not rendering (shouldRender=false)');
    return null;
  }

  console.log('[Frontend] [SplashScreen] Rendering splash screen UI');
  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-background transition-opacity duration-300 ease-in-out",
        isAnimating && isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo with pulse animation */}
        <div
          className={cn(
            "relative transition-all duration-500 ease-out",
            isAnimating && isVisible
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0"
          )}
        >
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <img
            src="./logo.png"
            alt="CaseSpace"
            className="relative w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-lg"
          />
        </div>

        {/* Loading spinner */}
        <div
          className={cn(
            "transition-all duration-300 delay-100",
            isAnimating && isVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

