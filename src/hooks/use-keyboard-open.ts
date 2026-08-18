import { useEffect, useState } from "react";

/**
 * Hook to detect when the virtual keyboard is open on mobile devices.
 * This helps prevent UI shifting issues in PWAs when the keyboard appears.
 */
export function useKeyboardOpen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const visualViewport = window.visualViewport;

    const handleResize = () => {
      const currentHeight = visualViewport.height;
      const windowHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, windowHeight - currentHeight);
      
      // Consider keyboard open if the viewport height is significantly reduced
      // and the width hasn't changed (to distinguish from rotation)
      const isKeyboardVisible = keyboardHeight > 150 && 
                                visualViewport.width === window.innerWidth;

      setIsKeyboardOpen(isKeyboardVisible);
      setKeyboardHeight(keyboardHeight);
    };

    // Initial check
    handleResize();

    // Listen for viewport changes (keyboard show/hide)
    visualViewport.addEventListener("resize", handleResize);
    
    return () => {
      visualViewport.removeEventListener("resize", handleResize);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
}