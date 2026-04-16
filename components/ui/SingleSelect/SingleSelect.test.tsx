import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import SingleSelect from "./SingleSelect.tsx";
import { ChainOption } from "@/types/types.ts";

const options: ChainOption[] = [
  { name: "Mainnet", chainId: "mainnet" },
  { name: "Mesa Testnet", chainId: "mesatestnet" },
  { name: "Custom", chainId: "custom" },
];

describe("SingleSelect", () => {
  // ---------------------------------------------------------------------------
  // Trigger button
  // ---------------------------------------------------------------------------

  describe("trigger button", () => {
    it("renders the trigger button", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows the placeholder when no value is selected", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      expect(screen.getByRole("button")).toHaveTextContent("Select...");
    });

    it("shows a custom placeholder when provided", () => {
      render(
        <SingleSelect
          options={options}
          value={null}
          onChange={vi.fn()}
          placeholder="Choose a chain"
        />
      );
      expect(screen.getByRole("button")).toHaveTextContent("Choose a chain");
    });

    it("shows the selected option name when a value is set", () => {
      render(
        <SingleSelect options={options} value={options[0]} onChange={vi.fn()} />
      );
      expect(screen.getByRole("button")).toHaveTextContent("Mainnet");
    });
  });

  // ---------------------------------------------------------------------------
  // Opening and closing
  // ---------------------------------------------------------------------------

  describe("open / close", () => {
    it("does not show the options list initially", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("shows the options list when the trigger is clicked", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("renders all options in the list", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText("Mainnet")).toBeInTheDocument();
      expect(screen.getByText("Mesa Testnet")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("closes the list after clicking the trigger a second time", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);
      fireEvent.click(trigger);
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  describe("selection", () => {
    it("calls onChange with the correct option when one is clicked", () => {
      const onChange = vi.fn();
      render(<SingleSelect options={options} value={null} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Mesa Testnet"));
      expect(onChange).toHaveBeenCalledWith(options[1]);
    });

    it("closes the list after an option is selected", () => {
      render(<SingleSelect options={options} value={null} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Mainnet"));
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("calls onChange exactly once per click", () => {
      const onChange = vi.fn();
      render(<SingleSelect options={options} value={null} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Custom"));
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});
