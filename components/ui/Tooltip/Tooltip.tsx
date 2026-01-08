import TooltipSVG from "@/components/ui/Tooltip/TooltipSVG.tsx";
import { useRef, useEffect, useState } from "react";

type TooltipProps = {
  title?: string;
  content: string;
};

const Tooltip = ({ title, content }: TooltipProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(125);
  const padding = 40; //(16px top + 16px bottom)

  useEffect(() => {
    //mesaure content height and pass into SVG height
    if (contentRef.current) {
      const measuredHeight = contentRef.current.scrollHeight;
      setContentHeight(measuredHeight + padding);
    }
  }, [content]);

  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-150 text-lightGreen text-sm backdrop-blur-md rounded-3xl">
      <TooltipSVG width={320} height={contentHeight}>
        <div className="flex items-center relative w-full h-full px-6 rounded-md">
          <div ref={contentRef} className="w-full text-left px-2">
            {title && <div className="text-sm mb-1">{title}</div>}
            <div className="text-xs">{content}</div>
          </div>
          {/* Tooltip arrow  */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
        </div>
      </TooltipSVG>
    </div>
  );
};

export default Tooltip;
