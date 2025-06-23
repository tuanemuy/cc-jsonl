"use client";

import { motion, useAnimation, useMotionValue } from "framer-motion";
import type { ReactNode } from "react";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = "",
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold && onSwipeRight) {
      controls.start({ x: 400, opacity: 0 });
      setTimeout(onSwipeRight, 300);
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      controls.start({ x: -400, opacity: 0 });
      setTimeout(onSwipeLeft, 300);
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ x }}
      className={`touch-pan-y ${className}`}
    >
      {children}
    </motion.div>
  );
}
