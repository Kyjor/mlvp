import { useState, useEffect, useRef, useCallback } from 'react';
import { SubtitlePosition, DragState } from '../types';

const INITIAL_POSITION: SubtitlePosition = { x: 50, y: 10 }; // % from bottom
const INITIAL_SIZE = 100; // percentage

interface UseSubtitleCustomizationProps {
  initialPosition?: SubtitlePosition;
  initialSize?: number;
}

export const useSubtitleCustomization = (props?: UseSubtitleCustomizationProps) => {
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitlePosition>(
    props?.initialPosition || INITIAL_POSITION
  );
  const [subtitleSize, setSubtitleSize] = useState<number>(
    props?.initialSize || INITIAL_SIZE
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isHoveringSubtitle, setIsHoveringSubtitle] = useState(false);

  const subtitleRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null); // For boundary checks

  const resetPosition = useCallback(() => setSubtitlePosition(INITIAL_POSITION), []);
  const resetSize = useCallback(() => setSubtitleSize(INITIAL_SIZE), []);

  const handleSubtitleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!subtitleRef.current || !videoWrapperRef.current) return;

    const rect = subtitleRef.current.getBoundingClientRect();
    const wrapperRect = videoWrapperRef.current.getBoundingClientRect();

    // Check if the click is on the subtitle text itself, not empty space within the overlay if it's wider.
    // This requires the subtitle text to be wrapped in an element that we can check.
    // For simplicity, we assume direct click on the draggable area for now.

    setDragState({
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      initialX: rect.left - wrapperRect.left, // Position relative to wrapper
      initialY: rect.top - wrapperRect.top,
      initialWidth: rect.width,
      initialHeight: rect.height,
    });
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragState || !dragState.isDragging || !subtitleRef.current || !videoWrapperRef.current) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const wrapperRect = videoWrapperRef.current.getBoundingClientRect();

    if (event.ctrlKey) { // Positioning
      let newX = dragState.initialX + dx;
      let newY = dragState.initialY + dy;

      // Convert to percentage relative to the video wrapper
      // X is relative to video wrapper width, Y is relative to video wrapper height for position
      // The subtitle 'left' is relative to its center, so we adjust
      // The subtitle 'bottom' is from the bottom of the wrapper.
      
      const newSubtitleXPercent = ((newX + dragState.initialWidth / 2) / wrapperRect.width) * 100;
      const newSubtitleBottomPercent = ((wrapperRect.height - (newY + dragState.initialHeight)) / wrapperRect.height) * 100;

      setSubtitlePosition({
        x: Math.max(0, Math.min(100, newSubtitleXPercent)),
        y: Math.max(0, Math.min(100, newSubtitleBottomPercent)),
      });

    } else if (event.altKey) { // Resizing with Alt+Drag
      // Calculate change relative to the center of the subtitle for intuitive scaling
      
      // Consider the drag vector relative to the subtitle center
      // A drag to the right or up from center should increase size
      // A drag to the left or down from center should decrease size
      
      // Calculate scale factor based on mouse movement from initial drag point
      // Simplified scaling: change in X has more impact
      const scaleMultiplier = (dx - dy) / 100; // dx for right/up, dy for down/left (inverted)
      let newSize = subtitleSize * (1 + scaleMultiplier);
      newSize = Math.max(10, Math.min(500, newSize)); // Clamp size between 10% and 500%
      setSubtitleSize(newSize);
      
      // Update dragState start for continuous scaling
      setDragState(prev => prev ? {...prev, startX: event.clientX, startY: event.clientY } : null);
    }
  }, [dragState, subtitleSize]);

  const handleMouseUp = useCallback(() => {
    if (dragState && dragState.isDragging) {
      setDragState(null);
    }
  }, [dragState]);

  const handleSubtitleWheel = useCallback((event: React.WheelEvent) => {
    // Scroll functionality removed - now only Alt+Drag is used for resizing
    event.preventDefault(); // Prevent default scrolling on subtitle area
  }, []);

  useEffect(() => {
    if (dragState && dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  return {
    subtitlePosition,
    setSubtitlePosition, // Expose setter if needed externally, e.g., for caching
    subtitleSize,
    setSubtitleSize, // Expose setter for caching
    isDraggingSubtitle: !!dragState?.isDragging,
    subtitleRef,
    videoWrapperRef, // Expose for App.tsx to assign
    resetPosition,
    resetSize,
    handleSubtitleMouseDown,
    handleSubtitleWheel,
    isHoveringSubtitle,
    setIsHoveringSubtitle,
  };
}; 