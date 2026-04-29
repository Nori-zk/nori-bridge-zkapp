import { describe, expect, it, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import NetworkSelectCardContent from "./NetworkSelectCardContent.tsx";
import { ChainOption } from "@/types/types.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetSelectedChain = vi.fn();
const mockSetChainAddress = vi.fn();

let mockSelectedChain: ChainOption | null = null;

vi.mock("@/providers/AuroWalletProvider/AuroWalletProvider.tsx", () => ({
  useAuroWallet: () => ({
    selectedChain: mockSelectedChain,
    setSelectedChain: mockSetSelectedChain,
    setChainAddress: mockSetChainAddress,
  }),
}));

vi.mock(
  "@/components/network-select-card/NetworkSelectCardSVG/NetworkSelectCardSVG.tsx",
  () => ({
    default: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  })
);

// Render SingleSelect as a plain select so we can change value in tests
vi.mock("@/components/ui/SingleSelect/SingleSelect.tsx", () => ({
  default: ({
    options,
    value,
    onChange,
  }: {
    options: ChainOption[];
    value: ChainOption | null;
    onChange: (o: ChainOption) => void;
  }) => (
    <select
      data-testid="single-select"
      value={value?.chainId ?? ""}
      onChange={(e) => {
        const option = options.find((o) => o.chainId === e.target.value);
        if (option) onChange(option);
      }}
    >
      {options.map((o) => (
        <option key={o.chainId} value={o.chainId}>
          {o.name}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/static_data.ts", () => ({
  chainOptions: [
    { name: "Mainnet", chainId: "mainnet" },
    { name: "Mesa Testnet", chainId: "mesatestnet" },
    { name: "Custom", chainId: "custom" },
  ],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderComponent = () =>
  render(<NetworkSelectCardContent onClose={vi.fn()} />);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NetworkSelectCardContent", () => {
  beforeEach(() => {
    mockSelectedChain = null;
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  describe("layout", () => {
    it("renders the close button", () => {
      renderComponent();
      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", () => {
      const onClose = vi.fn();
      render(<NetworkSelectCardContent onClose={onClose} />);
      fireEvent.click(screen.getByText("✕"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders the chain select dropdown", () => {
      renderComponent();
      expect(screen.getByTestId("single-select")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Custom chain hidden/shown
  // -------------------------------------------------------------------------

  describe("custom chain visibility", () => {
    it("does not show the URL input when no chain is selected", () => {
      renderComponent();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("does not show the URL input when a non-custom chain is selected", () => {
      mockSelectedChain = { name: "Mainnet", chainId: "mainnet" };
      renderComponent();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("does not show the Confirm button when a non-custom chain is selected", () => {
      mockSelectedChain = { name: "Mainnet", chainId: "mainnet" };
      renderComponent();
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });

    it("shows the URL input when Custom is selected", () => {
      mockSelectedChain = { name: "Custom", chainId: "custom" };
      renderComponent();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("shows the Confirm button when Custom is selected", () => {
      mockSelectedChain = { name: "Custom", chainId: "custom" };
      renderComponent();
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Confirm — validation
  // -------------------------------------------------------------------------

  describe("confirm validation", () => {
    beforeEach(() => {
      mockSelectedChain = { name: "Custom", chainId: "custom" };
    });

    it("shows an error when Confirm is clicked with an empty URL", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Confirm"));
      expect(screen.getByText("RPC URL is required")).toBeInTheDocument();
    });

    it("does not call setChainAddress when URL is empty", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Confirm"));
      expect(mockSetChainAddress).not.toHaveBeenCalled();
    });

    it("clears the error when the user starts typing after a failed submit", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Confirm"));
      expect(screen.getByText("RPC URL is required")).toBeInTheDocument();
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "h" },
      });
      expect(screen.queryByText("RPC URL is required")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Confirm — success
  // -------------------------------------------------------------------------

  describe("confirm success", () => {
    beforeEach(() => {
      mockSelectedChain = { name: "Custom", chainId: "custom" };
    });

    it("calls setChainAddress with the trimmed URL on valid submit", () => {
      renderComponent();
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "  https://my-rpc.example.com  " },
      });
      fireEvent.click(screen.getByText("Confirm"));
      expect(mockSetChainAddress).toHaveBeenCalledWith(
        "https://my-rpc.example.com"
      );
    });

    it("calls setChainAddress exactly once per confirm click", () => {
      renderComponent();
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "https://my-rpc.example.com" },
      });
      fireEvent.click(screen.getByText("Confirm"));
      expect(mockSetChainAddress).toHaveBeenCalledTimes(1);
    });
  });
});
