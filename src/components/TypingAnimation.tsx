import { useState, useEffect } from 'react';

interface TypingAnimationProps {
  baseText: string;
  endings: string[];
  typingSpeed?: number;
  delayBetweenEndings?: number;
  className?: string;
}

export function TypingAnimation({
  baseText,
  endings,
  typingSpeed = 50,
  delayBetweenEndings = 3000,
  className = ''
}: TypingAnimationProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentEndingIndex, setCurrentEndingIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const fullText = baseText + endings[currentEndingIndex];
    let currentIndex = displayText.length;

    if (isTyping && currentIndex < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.substring(0, currentIndex + 1));
      }, typingSpeed);
      return () => clearTimeout(timer);
    }

    if (isTyping && currentIndex === fullText.length) {
      const timer = setTimeout(() => {
        setIsTyping(false);
      }, delayBetweenEndings);
      return () => clearTimeout(timer);
    }

    if (!isTyping && displayText.length > baseText.length) {
      const timer = setTimeout(() => {
        if (displayText.length > baseText.length) {
          setDisplayText(displayText.substring(0, displayText.length - 1));
        }
      }, 30);
      return () => clearTimeout(timer);
    }

    if (!isTyping && displayText === baseText) {
      const timer = setTimeout(() => {
        setCurrentEndingIndex((prev) => (prev + 1) % endings.length);
        setIsTyping(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [displayText, isTyping, baseText, endings, typingSpeed, delayBetweenEndings, currentEndingIndex]);

  return (
    <span className={className}>
      {displayText}
      {isTyping && <span className="typing-cursor">|</span>}
    </span>
  );
}
