import TooltipSVG from "@/components/ui/Tooltip/TooltipSVG.tsx";

type TooltipProps = {
  content: string;
};

const Tooltip = ({ content }: TooltipProps) => {
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-150 text-lightGreen text-sm">
      {/* <div className="bg-black/50 h-full rounded-xl p-3 text-sm text-lightGreen/90 shadow-lg backdrop-blur-sm border border-lightGreen">
        <div className="relative">
          {content}
          {/* Tooltip arrow 
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
        </div>
      </div> */}

      <TooltipSVG>
        <div className="relative w-full flex items-center justify-center h-full p-4 text-sm">
          {content}
          {/* Tooltip arrow  */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
        </div>
      </TooltipSVG>
    </div>
  );
};

export default Tooltip;
