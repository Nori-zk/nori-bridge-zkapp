import { ReactNode } from "react";

type TextButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button" | "reset";
  onClick?: () => void;
  className?: string;
};

const TextButton = ({
  children,
  disabled = false,
  type = "button",
  onClick,
  className = "",
}: TextButtonProps) => {
  return (
    <button
      disabled={disabled}
      type={type}
      onClick={onClick}
      className={`w-full rounded-lg px-4 py-3 border-[1px] ${
        disabled ? "text-white/20 border-white/20" : "text-white border-white"
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default TextButton;
