import { useAtomValue } from "jotai";
import { useRef, useCallback, useEffect } from "react";
import { isDraggingAtom } from "../atoms";

export function useAutoScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const isDragging = useAtomValue(isDraggingAtom);
  const autoScrollSpeed = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  const performAutoScroll = useCallback(() => {
    if (
      scrollContainerRef.current &&
      (autoScrollSpeed.current.x !== 0 || autoScrollSpeed.current.y !== 0)
    ) {
      scrollContainerRef.current.scrollLeft += autoScrollSpeed.current.x;
      scrollContainerRef.current.scrollTop += autoScrollSpeed.current.y;
      // eslint-disable-next-line react-hooks/immutability
      animationFrameId.current = requestAnimationFrame(performAutoScroll);
    } else {
      animationFrameId.current = null;
    }
  }, [scrollContainerRef]);

  const stopAutoScroll = useCallback(() => {
    autoScrollSpeed.current = { x: 0, y: 0 };
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDragging || !scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const { top, bottom, left, right } = container.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const zoneSize = 200;
      const maxSpeed = 70;

      let nextX = 0;
      let nextY = 0;

      if (mouseX < left + zoneSize) {
        const distance = Math.max(0, mouseX - left);
        const intensity = 1 - distance / zoneSize;
        nextX = -Math.max(2, intensity * intensity * maxSpeed);
      } else if (mouseX > right - zoneSize) {
        const distance = Math.max(0, right - mouseX);
        const intensity = 1 - distance / zoneSize;
        nextX = Math.max(2, intensity * intensity * maxSpeed);
      }

      if (mouseY < top + zoneSize) {
        const distance = Math.max(0, mouseY - top);
        const intensity = 1 - distance / zoneSize;
        nextY = -Math.max(2, intensity * intensity * maxSpeed);
      } else if (mouseY > bottom - zoneSize) {
        const distance = Math.max(0, bottom - mouseY);
        const intensity = 1 - distance / zoneSize;
        nextY = Math.max(2, intensity * intensity * maxSpeed);
      }

      autoScrollSpeed.current = { x: nextX, y: nextY };

      if ((nextX !== 0 || nextY !== 0) && !animationFrameId.current) {
        performAutoScroll();
      }
    },
    [isDragging, scrollContainerRef, performAutoScroll],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!scrollContainerRef.current?.contains(e.relatedTarget as Node)) {
        stopAutoScroll();
      }
    },
    [scrollContainerRef, stopAutoScroll],
  );

  useEffect(() => {
    if (!isDragging) stopAutoScroll();
  }, [isDragging, stopAutoScroll]);

  return { handleDragOver, handleDragLeave };
}
