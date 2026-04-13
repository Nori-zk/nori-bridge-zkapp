import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import LockTokens from "./LockTokens.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx");
vi.mock("@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx");
vi.mock("@/helpers/localStorage2.ts", () => ({
  Store: {
    forEth: vi.fn(() => ({ codeVerifier: null })),
  },
}));
vi.mock("@/helpers/codeChallengeHelper.ts", () => ({
  setCodeChallenge: vi.fn(),
}));

// Mock ethers dynamic import used inside the gas-estimation effect
vi.mock("ethers", () => {
  const mockFormatEther = vi.fn(() => "0.001");
  const mockFormatUnits = vi.fn(() => "10");
  const mockGetFeeData = vi.fn().mockResolvedValue({
    maxFeePerGas: 10000000000n,
    gasPrice: 10000000000n,
  });
  const mockBrowserProvider = vi.fn().mockImplementation(() => ({
    getFeeData: mockGetFeeData,
  }));
  return {
    BrowserProvider: mockBrowserProvider,
    ethers: {
      formatEther: mockFormatEther,
      formatUnits: mockFormatUnits,
    },
    // expose for test inspection
    __mockGetFeeData: mockGetFeeData,
    __mockBrowserProvider: mockBrowserProvider,
    __mockFormatEther: mockFormatEther,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUseMetaMaskWallet = useMetaMaskWallet as Mock;
const mockUseNoriBridge = useNoriBridge as Mock;

const buildWalletDefaults = (overrides = {}) => ({
  walletAddress: "0xABC123",
  balance: "1.5",
  lockTokens: vi.fn().mockResolvedValue(42),
  signMessage: vi.fn().mockResolvedValue({ signature: "0xSIG" }),
  ...overrides,
});

const buildBridgeDefaults = (overrides = {}) => ({
  state: {
    context: {
      activeDepositNumber: null,
      mintWorker: null,
    },
  },
  setDepositNumber: vi.fn(),
  ...overrides,
});

// Simulate window.ethereum being present so gas estimation can proceed
const setupWindowEthereum = () => {
  Object.defineProperty(window, "ethereum", {
    value: {},
    writable: true,
    configurable: true,
  });
};

const removeWindowEthereum = () => {
  Object.defineProperty(window, "ethereum", {
    value: undefined,
    writable: true,
    configurable: true,
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LockTokens", () => {
  beforeEach(() => {
    setupWindowEthereum();
    mockUseMetaMaskWallet.mockReturnValue(buildWalletDefaults());
    mockUseNoriBridge.mockReturnValue(buildBridgeDefaults());
  });

  afterEach(() => {
    vi.clearAllMocks();
    removeWindowEthereum();
  });

  // -------------------------------------------------------------------------
  // Input disabled whilst max is being calculated
  // -------------------------------------------------------------------------

  describe("input disabled state whilst maxLockable resolves", () => {
    it("disables the text input on initial render before gas estimation completes", () => {
      // Render without resolving the gas estimation async effect
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("shows 'calculating...' in the Available display before max resolves", () => {
      render(<LockTokens />);
      expect(screen.getByText(/calculating\.\.\./i)).toBeInTheDocument();
    });

    it("enables the input once gas estimation resolves a non-zero max", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");

      // Initially disabled
      expect(input).toBeDisabled();

      // Wait for the async gas estimation effect to finish
      await waitFor(() => expect(input).not.toBeDisabled());
    });

    it("disables input when balance is missing (maxLockable stays null)", async () => {
      mockUseMetaMaskWallet.mockReturnValue(
        buildWalletDefaults({ balance: null })
      );
      render(<LockTokens />);
      const input = screen.getByRole("textbox");

      // No balance → gas estimation sets maxLockable to null immediately
      await waitFor(() => expect(input).toBeDisabled());
    });

    it("disables input when window.ethereum is absent (maxLockable stays null)", async () => {
      removeWindowEthereum();
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).toBeDisabled());
    });

    it("disables input when walletAddress is null (maxLockable stays null)", async () => {
      mockUseMetaMaskWallet.mockReturnValue(
        buildWalletDefaults({ walletAddress: null })
      );
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).toBeDisabled());
    });
  });

  // -------------------------------------------------------------------------
  // Switching wallets
  // -------------------------------------------------------------------------

  describe("switching wallets", () => {
    it("clears the amount input when walletAddress changes", async () => {
      const { rerender } = render(<LockTokens />);

      // Wait for max to resolve so input is enabled
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      // Type a value
      fireEvent.change(input, { target: { value: "0.5" } });
      expect(input).toHaveValue("0.5");

      // Switch to a different wallet address
      mockUseMetaMaskWallet.mockReturnValue(
        buildWalletDefaults({ walletAddress: "0xDEF456" })
      );
      rerender(<LockTokens />);

      await waitFor(() => expect(input).toHaveValue(""));
    });

    it("re-runs gas estimation when wallet switches (input re-enables)", async () => {
      const { rerender } = render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      // Switch wallet — gas estimation will re-run; input should briefly disable
      // then re-enable once estimation completes again
      mockUseMetaMaskWallet.mockReturnValue(
        buildWalletDefaults({ walletAddress: "0xNEW999", balance: "2.0" })
      );
      rerender(<LockTokens />);

      await waitFor(() => expect(input).not.toBeDisabled());
    });
  });

  // -------------------------------------------------------------------------
  // Max button
  // -------------------------------------------------------------------------

  describe("Max button", () => {
    it("populates the input with the max lockable amount when clicked", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      const maxButton = screen.getByRole("button", { name: /eth/i });
      fireEvent.click(maxButton);

      // The value set comes from the resolved maxLockable
      await waitFor(() =>
        expect((input as HTMLInputElement).value).not.toBe("")
      );
    });

    it("Max button is disabled when activeDepositNumber is set", async () => {
      mockUseNoriBridge.mockReturnValue(
        buildBridgeDefaults({ state: { context: { activeDepositNumber: 5, mintWorker: null } } })
      );
      render(<LockTokens />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /eth/i })
        ).toBeDisabled()
      );
    });
  });

  // -------------------------------------------------------------------------
  // activeDepositNumber disables input
  // -------------------------------------------------------------------------

  describe("active deposit in progress", () => {
    it("disables the text input when activeDepositNumber is set", async () => {
      mockUseNoriBridge.mockReturnValue(
        buildBridgeDefaults({
          state: { context: { activeDepositNumber: 7, mintWorker: null } },
        })
      );
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      // Should be disabled regardless of gas estimation state
      expect(input).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Validation errors
  // -------------------------------------------------------------------------

  describe("validation", () => {
    it("shows error when amount exceeds max lockable", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "9999" } });

      // Submit the form to trigger validation
      fireEvent.submit(input.closest("form")!);

      await waitFor(() =>
        expect(
          screen.getByText(/cannot exceed max lockable amount/i)
        ).toBeInTheDocument()
      );
    });

    it("shows error when amount is below minimum", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "0.00000001" } });
      fireEvent.submit(input.closest("form")!);

      await waitFor(() =>
        expect(
          screen.getByText(/must be at least 0\.0001/i)
        ).toBeInTheDocument()
      );
    });

    it("shows error when amount field is empty on submit", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.submit(input.closest("form")!);

      await waitFor(() =>
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
      );
    });

    it("shows error for invalid decimal format", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "abc" } });
      fireEvent.submit(input.closest("form")!);

      await waitFor(() =>
        expect(
          screen.getByText(/must be a valid decimal/i)
        ).toBeInTheDocument()
      );
    });
  });

  // -------------------------------------------------------------------------
  // Lock Tokens button label states
  // -------------------------------------------------------------------------

  describe("submit button labels", () => {
    it("shows 'Lock Tokens' in the idle state", async () => {
      render(<LockTokens />);
      expect(screen.getByRole("button", { name: /lock tokens/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Receive / Fee display
  // -------------------------------------------------------------------------

  describe("Receive and Fee display", () => {
    it("does not show Receive or Fee before any input is entered", async () => {
      render(<LockTokens />);
      await waitFor(() => expect(screen.getByRole("textbox")).not.toBeDisabled());

      expect(screen.queryByText(/receive/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/fee/i)).not.toBeInTheDocument();
    });

    it("shows Receive and Fee once the user types a value", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "0.5" } });

      expect(screen.getByText(/receive/i)).toBeInTheDocument();
      expect(screen.getByText(/fee/i)).toBeInTheDocument();
    });

    it("displays receive amount as input minus 0.0005 fee", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "1.0" } });

      // 1.0 - 0.0005 = 0.99950000
      await waitFor(() =>
        expect(screen.getByText(/0\.99950000 neth/i)).toBeInTheDocument()
      );
    });

    it("shows hardcoded fee of 0.0005 ETH", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "0.5" } });

      expect(screen.getByText(/fee: 0\.0005 eth/i)).toBeInTheDocument();
    });

    it("receive amount floors at 0 when input is less than fee", async () => {
      render(<LockTokens />);
      const input = screen.getByRole("textbox");
      await waitFor(() => expect(input).not.toBeDisabled());

      fireEvent.change(input, { target: { value: "0.0003" } });

      await waitFor(() =>
        expect(screen.getByText(/0\.00000000 neth/i)).toBeInTheDocument()
      );
    });

    it("Max button remains visible when no input value is entered", async () => {
      render(<LockTokens />);
      await waitFor(() =>
        expect(screen.queryByText(/calculating\.\.\./i)).not.toBeInTheDocument()
      );

      expect(screen.queryByText(/receive/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /eth/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Available display
  // -------------------------------------------------------------------------

  describe("Available display", () => {
    it("shows 'calculating...' when maxLockable has not resolved", () => {
      render(<LockTokens />);
      expect(screen.getByText(/calculating\.\.\./i)).toBeInTheDocument();
    });

    it("shows the formatted ETH amount once gas estimation resolves", async () => {
      render(<LockTokens />);
      await waitFor(() =>
        expect(screen.queryByText(/calculating\.\.\./i)).not.toBeInTheDocument()
      );
      // Should now show a numeric ETH amount
      expect(screen.getByText(/\d+\.\d+ eth/i)).toBeInTheDocument();
    });
  });
});
