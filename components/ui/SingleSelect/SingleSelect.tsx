import { useState, useRef, useEffect, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChainOption } from "@/types/types.ts";

type SingleSelectProps = {
  options: ChainOption[];
  value: ChainOption | null;
  onChange: (option: ChainOption) => void;
  placeholder?: string;
};

const SingleSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
}: SingleSelectProps) => {
  const [open, setOpen] = useState(false);
  const [listStyle, setListStyle] = useState<CSSProperties>({});

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setListStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open]);

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-left text-white/20"
      >
        {value ? value.name : placeholder}
      </button>

      {/* Portal renders the list on document.body so it escapes any
          overflow:hidden ancestor (e.g. the SVG wrapper card). Position is
          kept in sync with the trigger button via getBoundingClientRect. */}
      {open &&
        createPortal(
          <ul
            style={listStyle}
            className="border border-white/20 rounded-lg bg-veryDarkGreen z-[9999]"
          >
            {options.map((option) => (
              <li key={option.chainId}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-white/60 hover:text-white"
                >
                  {option.name}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default SingleSelect;
