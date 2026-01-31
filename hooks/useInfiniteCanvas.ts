
import { useState, useRef, useEffect, MouseEvent, WheelEvent, TouchEvent } from 'react';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface UseInfiniteCanvasProps {
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
}

export const useInfiniteCanvas = ({
  initialScale = 1,
  minScale = 0.7,
  maxScale = 3
}: UseInfiniteCanvasProps = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: initialScale });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center the canvas content initially
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setTransform({
        x: (width - width * initialScale) / 2,
        y: (height - height * initialScale) / 2,
        scale: initialScale
      });
    }
  }, [initialScale]);

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(transform.scale * (1 + scaleAmount), minScale), maxScale);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate mouse position relative to canvas container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards the mouse position
    const scaleRatio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleRatio;
    const newY = mouseY - (mouseY - transform.y) * scaleRatio;

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - transform.x, y: touch.clientY - transform.y };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setTransform(prev => ({
      ...prev,
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y
    }));
  };

  const handleTouchEnd = () => setIsDragging(false);

  const zoomIn = () => setTransform(prev => ({
    ...prev,
    scale: Math.min(prev.scale * 1.2, maxScale)
  }));

  const zoomOut = () => setTransform(prev => ({
    ...prev,
    scale: Math.max(prev.scale / 1.2, minScale)
  }));

  return {
    containerRef,
    transform,
    isDragging,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    controls: {
      zoomIn,
      zoomOut,
      resetTransform: () => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setTransform({
            x: (width - width * initialScale) / 2,
            y: (height - height * initialScale) / 2,
            scale: initialScale
          });
        }
      }
    }
  };
};
