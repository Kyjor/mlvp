import { useState, useEffect, useRef } from 'react';
import { SubtitlePosition, DragState } from '../types';

export const useSubtitleCustomization = () => {
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitlePosition>({ x: 50, y: 85 });
  const [subtitleSize, setSubtitleSize] = useState(100);
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [initialSubtitlePos, setInitialSubtitlePos] = useState({ x: 0, y: 0 });
  
  const subtitleRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  // Subtitle interaction handlers
  const handleSubtitleMouseDown = (e: React.MouseEvent) => {
    if (subtitleRef.current && videoWrapperRef.current) {
      e.preventDefault();
      setIsDraggingSubtitle(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setInitialSubtitlePos({ x: subtitlePosition.x, y: subtitlePosition.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingSubtitle && videoWrapperRef.current) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      
      // Check if Control key is held for position moving
      if (e.ctrlKey) {
        // Position movement (existing behavior)
        const rect = videoWrapperRef.current.getBoundingClientRect();
        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;
        
        const newX = Math.max(0, Math.min(100, initialSubtitlePos.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100, initialSubtitlePos.y + deltaYPercent));
        
        setSubtitlePosition({ x: newX, y: newY });
      } else {
        // Size adjustment based on drag direction
        // Up/Right = bigger, Down/Left = smaller
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const direction = deltaX + (-deltaY); // Up and Right are positive
        
        // Scale factor based on distance and direction
        const scaleFactor = distance * 0.2; // Adjust sensitivity
        const sizeChange = direction > 0 ? scaleFactor : -scaleFactor;
        
        // Apply size change from initial size (100%)
        const newSize = Math.max(50, Math.min(200, 100 + sizeChange));
        setSubtitleSize(newSize);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingSubtitle(false);
  };

  const handleSubtitleWheel = (e: React.WheelEvent) => {
    // Only resize if Control key is held
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY; // Invert for natural scroll behavior
      const sizeChange = delta > 0 ? 5 : -5;
      const newSize = Math.max(50, Math.min(200, subtitleSize + sizeChange));
      setSubtitleSize(newSize);
    }
  };

  // Event listeners for mouse movement and release
  useEffect(() => {
    if (isDraggingSubtitle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingSubtitle, dragStartPos, initialSubtitlePos]);

  const resetPosition = () => setSubtitlePosition({ x: 50, y: 85 });
  const resetSize = () => setSubtitleSize(100);

  return {
    subtitlePosition,
    subtitleSize,
    isDraggingSubtitle,
    subtitleRef,
    videoWrapperRef,
    handleSubtitleMouseDown,
    handleSubtitleWheel,
    resetPosition,
    resetSize,
    setSubtitlePosition,
    setSubtitleSize
  };
}; 