import React from "react";
import EthereumGrey from "@/public/assets/EthereumGrey.svg";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  hasValue?: boolean;
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ id, hasValue = false, ...props }, ref) => {
    const shouldShowWhiteBorder = hasValue && !props.disabled;

    return (
      <div className="relative w-full">
        <input
          id={id}
          ref={ref}
          {...props}
          className={`w-full bg-transparent placeholder-white/20 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-white/20
            ${
              shouldShowWhiteBorder
                ? "border border-white"
                : "border border-white/20"
            }`}
          placeholder="0.0001"
        />
        <div className="absolute inset-y-0 right-4 flex items-center">
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
