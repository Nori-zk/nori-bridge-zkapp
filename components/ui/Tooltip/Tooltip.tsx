type TooltipProps = {
  content: string;
};

const Tooltip = ({ content }: TooltipProps) => {
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
      <div className="bg-black/95 h-full rounded-xl p-3 text-sm text-lightGreen/90 shadow-lg backdrop-blur-sm">
        <div className="relative">
          {content}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
        </div>
      </div>
    </div>
  );
};

export default Tooltip;
