import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import TextInput from "./TextInput.tsx";

vi.mock("@/components/ui/Tooltip/Tooltip.tsx", () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="tooltip">{content}</div>
  ),
}));

describe("TextInput", () => {
  // -------------------------------------------------------------------------
  // Default (no error)
  // -------------------------------------------------------------------------

  describe("default state", () => {
    it("renders the text input", () => {
      render(<TextInput />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("does not render the error icon when no errorMessage is provided", () => {
      render(<TextInput />);
      expect(screen.queryByText("i")).not.toBeInTheDocument();
    });

    it("applies the muted border class by default", () => {
      render(<TextInput />);
      expect(screen.getByRole("textbox")).toHaveClass("border-white/20");
    });

    it("applies the white border when hasValue is true", () => {
      render(<TextInput hasValue />);
      expect(screen.getByRole("textbox")).toHaveClass("border-white");
    });
  });

  // -------------------------------------------------------------------------
  // Error state — border
  // -------------------------------------------------------------------------

  describe("error state border", () => {
    it("applies red border when errorMessage is provided", () => {
      render(<TextInput errorMessage="Something went wrong" />);
      expect(screen.getByRole("textbox")).toHaveClass("border-red-500");
    });

    it("does not apply white or muted border when errorMessage is set", () => {
      render(<TextInput hasValue errorMessage="Something went wrong" />);
      const input = screen.getByRole("textbox");
      expect(input).not.toHaveClass("border-white/20");
      expect(input).not.toHaveClass("border-white");
    });
  });

  // -------------------------------------------------------------------------
  // Error state — icon
  // -------------------------------------------------------------------------

  describe("error icon", () => {
    it("renders the i icon when errorMessage is provided", () => {
      render(<TextInput errorMessage="Too high" />);
      expect(screen.getByText("i")).toBeInTheDocument();
    });

    it("does not render the tooltip initially", () => {
      render(<TextInput errorMessage="Too high" />);
      expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
    });

    it("shows the tooltip with the error message on mouse enter", () => {
      render(<TextInput errorMessage="Too high" />);
      fireEvent.mouseEnter(screen.getByText("i").parentElement!);
      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip")).toHaveTextContent("Too high");
    });

    it("hides the tooltip on mouse leave", () => {
      render(<TextInput errorMessage="Too high" />);
      const iconWrapper = screen.getByText("i").parentElement!;
      fireEvent.mouseEnter(iconWrapper);
      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
      fireEvent.mouseLeave(iconWrapper);
      expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
    });
  });
});
