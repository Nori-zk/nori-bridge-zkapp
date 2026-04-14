import React, { useState } from "react";
import EthereumGrey from "@/public/assets/EthereumGrey.svg";
import Tooltip from "@/components/ui/Tooltip/Tooltip.tsx";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  hasValue?: boolean;
  errorMessage?: string;
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ id, hasValue = false, errorMessage, ...props }, ref) => {
    const [showErrorTooltip, setShowErrorTooltip] = useState(false);
    const shouldShowWhiteBorder = hasValue && !props.disabled;

    return (
      <div className="relative w-full">
        <input
          id={id}
          ref={ref}
          {...props}
          className={`w-full bg-transparent placeholder-white/20 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-white/20
            ${
              errorMessage
                ? "border border-red-500 focus:ring-red-500/20"
                : shouldShowWhiteBorder
                ? "border border-white"
                : "border border-white/20"
            }`}
          placeholder="0.0001"
        />
        <div className="absolute inset-y-0 right-4 flex items-center gap-2">
          {errorMessage && (
            <div
              className="relative"
              onMouseEnter={() => setShowErrorTooltip(true)}
              onMouseLeave={() => setShowErrorTooltip(false)}
            >
              <div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center cursor-help text-xs text-red-500 italic font-serif">
                i
              </div>
              {showErrorTooltip && <Tooltip content={errorMessage} />}
            </div>
          )}
          <EthereumGrey
            title="EthereumSVG"
            className={`scale-[0.75] ${
              shouldShowWhiteBorder ? "opacity-100" : "opacity-20"
            }`}
          />
        </div>
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
