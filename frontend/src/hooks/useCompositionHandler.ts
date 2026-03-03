import { useState } from 'react';

/**
 * Hook to handle IME composition events for Japanese/Chinese input.
 *
 * Problem: IME composition fires onChange before final character is committed,
 * causing premature search/filter triggers.
 *
 * Solution: Track composition state and skip updates during composition.
 * Only trigger callbacks after onCompositionEnd fires.
 *
 * Usage:
 * const { isComposing, handleCompositionStart, handleCompositionEnd } = useCompositionHandler();
 * <input
 *   onCompositionStart={handleCompositionStart}
 *   onCompositionEnd={handleCompositionEnd}
 *   onChange={(e) => {
 *     if (!isComposing) triggerSearch(e.target.value);
 *   }}
 * />
 */
export const useCompositionHandler = () => {
  const [isComposing, setIsComposing] = useState(false);

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return {
    isComposing,
    handleCompositionStart,
    handleCompositionEnd,
  };
};
