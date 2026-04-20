import ErrorTooltipSVG from "@/components/ui/Tooltip/ErrorTooltipSVG.tsx";
import TooltipSVG from "@/components/ui/Tooltip/TooltipSVG.tsx";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  title?: string;
  content: string;
  isError?: boolean;
  anchorRect?: DOMRect;
};

const Tooltip = ({ title, content, isError = false, anchorRect }: TooltipProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(125);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const padding = 40; //(16px top + 16px bottom)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight + padding);
    }
  }, [content]);

  useEffect(() => {
    if (anchorRect) {
      setPosition({
        top: anchorRect.top,
        left: anchorRect.left + anchorRect.width / 2,
      });
    } else if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left + rect.width / 2 });
    }
  }, [anchorRect]);

  const SVGWrapper = isError ? ErrorTooltipSVG : TooltipSVG;
  const textColor = isError ? "text-tooltipErrorred" : "text-lightGreen";

  if (typeof window === "undefined") return null;

  return (
    <>
      {!anchorRect && (
        <div
          ref={anchorRef}
          style={{ position: "absolute", width: 0, height: 0 }}
        />
      )}
      {createPortal(
        <div
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: "translate(-50%, calc(-100% - 8px))",
            zIndex: 9999,
          }}
          className={`${textColor} text-sm backdrop-blur-md rounded-3xl`}
        >
          <SVGWrapper width={320} height={contentHeight}>
            <div className="flex items-center relative w-full h-full px-6 rounded-md">
              <div ref={contentRef} className="w-full text-left px-2">
                {title && <div className="text-sm mb-1">{title}</div>}
                <div className="text-xs">{content}</div>
              </div>
              {!isError && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
              )}
            </div>
          </SVGWrapper>
        </div>,
        document.body,
      )}
    </>
  );
};

export default Tooltip;
