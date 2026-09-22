import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";

export interface GridHandle {
  updatePointer: (x: number, y: number) => void;
  hideHighlight: () => void;
}

interface InteractiveGridProps {
  show: boolean;
  isTransitioning: boolean;
}

export const InteractiveGrid = forwardRef<GridHandle, InteractiveGridProps>(({ show, isTransitioning }, ref) => {
  const highlightRef = useRef<SVGGElement>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useImperativeHandle(ref, () => ({
    updatePointer: (x: number, y: number) => {
      if (isReducedMotion || isTouch || !highlightRef.current || (!show && !isTransitioning)) return;

      const gridSize = window.innerWidth >= 768 ? 60 : 36;
      const snappedX = Math.floor(x / gridSize) * gridSize;
      const snappedY = Math.floor(y / gridSize) * gridSize;

      highlightRef.current.style.opacity = "1";
      highlightRef.current.setAttribute("transform", `translate(${snappedX}, ${snappedY})`);

      const rects = highlightRef.current.querySelectorAll("rect");
      rects.forEach(rect => {
        rect.setAttribute("width", gridSize.toString());
        rect.setAttribute("height", gridSize.toString());
      });
    },
    hideHighlight: () => {
      if (highlightRef.current) {
        highlightRef.current.style.opacity = "0";
      }
    }
  }));

  // Define mask explicitly for transition
  const maskStyle = (show || isReducedMotion)
    ? { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }
    : { clipPath: "polygon(0 0, 0% 0, 0% 100%, 0 100%)" };

  return (
    <div
      className={`absolute inset-0 z-0 bg-navy-950 pointer-events-none ${!isReducedMotion ? 'transition-all duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)]' : ''}`}
      style={maskStyle}
    >
      <svg width="100%" height="100%" className="absolute inset-0 z-0 pointer-events-none">
        <defs>
          {/* Desktop Pattern */}
          <pattern id="desktop-grid-minor" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(25, 185, 154, 0.05)" strokeWidth="1"/>
          </pattern>
          <pattern id="desktop-grid-major" width="240" height="240" patternUnits="userSpaceOnUse">
            <rect width="240" height="240" fill="url(#desktop-grid-minor)" />
            <path d="M 240 0 L 0 0 0 240" fill="none" stroke="rgba(25, 185, 154, 0.12)" strokeWidth="1.5"/>
          </pattern>

          {/* Mobile Pattern */}
          <pattern id="mobile-grid-minor" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(25, 185, 154, 0.05)" strokeWidth="1"/>
          </pattern>
          <pattern id="mobile-grid-major" width="144" height="144" patternUnits="userSpaceOnUse">
            <rect width="144" height="144" fill="url(#mobile-grid-minor)" />
            <path d="M 144 0 L 0 0 0 144" fill="none" stroke="rgba(25, 185, 154, 0.12)" strokeWidth="1.5"/>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#desktop-grid-major)" className="hidden md:block" />
        <rect width="100%" height="100%" fill="url(#mobile-grid-major)" className="block md:hidden" />

        {/* Highlight Group */}
        {!isReducedMotion && !isTouch && (
          <g ref={highlightRef} className="transition-opacity duration-200 ease-out pointer-events-none" style={{ opacity: 0 }}>
            {/* Blurred Understroke for Glow */}
            <g opacity="0.4" filter="blur(3px)">
              <rect x="0" y="0" width="60" height="60" fill="none" stroke="#19B99A" strokeWidth="3" />
            </g>
            {/* Core Illuminated Grid Lines */}
            <rect x="0" y="0" width="60" height="60" fill="none" stroke="#19B99A" strokeWidth="1.5" opacity="0.9" />
          </g>
        )}
      </svg>
    </div>
  );
});
