"use client";

import { useEffect, useState, useMemo } from "react";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAuroWallet } from "@/providers/AuroWalletProvider/AuroWalletProvider.tsx";
import { ethers } from "ethers";
import envConfig from "@/helpers/env.ts";
import { getCodeChallenge } from "@/helpers/codeChallengeHelper.ts";
import { PairResult } from "@/types/types.ts";

type TransactionTableProps = {
  setLockedSoFar: (value: number) => void;
  setMintedSoFar: (value: number) => void;
};

const TransactionTable = ({
  setLockedSoFar,
  setMintedSoFar,
}: TransactionTableProps) => {
  const { contract, walletAddress: ethAddress } = useMetaMaskWallet();
  const [ethTransactions, setEthTransactions] = useState<any[]>([]);
  const [ethLoading, setEthLoading] = useState(false);
  const [ethError, setEthError] = useState<string | null>(null);

  const [minaTransactions, setMinaTransactions] = useState<any[]>([]);
  const [minaLoading, setMinaLoading] = useState(false);
  const [minaError, setMinaError] = useState<string | null>(null);
  const [codeChallenge, setCodeChallenge] = useState<string | null>(null);

  const { walletAddress: minaAddress } = useAuroWallet();

  useEffect(() => {
    const fetchCodeChallenge = async () => {
      if (!ethAddress) {
        setCodeChallenge(null);
        return;
      }

      const challenge = await getCodeChallenge(ethAddress, minaAddress);
      setCodeChallenge(challenge);
    };

    fetchCodeChallenge();
  }, [ethAddress, minaAddress]);

  useEffect(() => {
    const fetchMinaTransactions = async () => {
      if (!minaAddress) {
        setMinaTransactions([]);
        return;
      }

      setMinaLoading(true);
      setMinaError(null);

      try {
        const tokenId = "x2BoZdzJ9Sj4QdV9u886PfcaKsh3cSHw96tB7uBNsSpUKmXWSw"; //harcoded for now - to change
        const baseUrl = `https://mina-zkapp-transaction-api.devnet.nori.it.com/api/transactions`;
        let allTransactions: any[] = [];
        let page = 1;
        const limit = 100; // max allowed by API

        // Paginate through all results
        while (true) {
          const url = `${baseUrl}?zkappAddress=${envConfig.NORI_TOKEN_CONTROLLER_ADDRESS}&userAccount=${minaAddress}&tokenId=${tokenId}&page=${page}&limit=${limit}`;

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          const transactions = result.data.map((tx: any) => {
            // Keep as BigInt (10^6 base units for nETH bridge token)
            const magnitudeBaseUnits = BigInt(tx.token_minted || "0");
            const formattedAmount = (
              Number(magnitudeBaseUnits) / 1_000_000
            ).toFixed(4);

            const date = new Date(tx.tx_time);
            const dateTimestamp = date.getTime();
            const formattedDate = date.toLocaleDateString("en-GB", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            let attestationHash = "";
            if (tx.event_values) {
              try {
                const eventValues = JSON.parse(tx.event_values);
                attestationHash =
                  eventValues.attestationHash || eventValues[0] || "";
              } catch (e) {
                attestationHash = tx.event_values;
              }
            }

            return {
              ethHash: attestationHash, // This should match with ETH attestationHash
              minaHash: tx.transaction_hash,
              magnitudeBaseUnits: magnitudeBaseUnits, // BigInt in 10^6 base units
              nAmount: `${formattedAmount} nETH`, // Only for display
              date: formattedDate,
              dateTimestamp: dateTimestamp,
              status: tx.status,
            };
          });

          allTransactions.push(...transactions);

          // Check if there are more pages
          if (page >= result.pagination.totalPages) {
            break;
          }
          page++;
        }

        // Sort by date descending (most recent first)
        allTransactions.sort(
          (a: any, b: any) => b.dateTimestamp - a.dateTimestamp
        );

        // console.log('🔍 DEBUG: Mina transactions fetched:', {
        //   count: allTransactions.length,
        //   transactions: allTransactions,
        // });

        setMinaTransactions(allTransactions);
      } catch (err) {
        console.error("Error fetching Mina transactions:", err);
        setMinaError(
          err instanceof Error ? err.message : "Failed to fetch transactions"
        );
      } finally {
        setMinaLoading(false);
      }
    };

    fetchMinaTransactions();
  }, [minaAddress]);

  useEffect(() => {
    const fetchEthTransactions = async () => {
      if (!contract || !ethAddress) {
        setEthTransactions([]);
        return;
      }

      setEthLoading(true);
      setEthError(null);

      try {
        // Query TokensLocked events filtered by the user's address
        const filter = contract.filters.TokensLocked(ethAddress);
        let events = await contract.queryFilter(filter);

        //further filter by codeChallenge
        if (codeChallenge) {
          events = events.filter((e) => {
            if ("args" in e) {
              const attestationHashBigInt = e.args[1];
              const attestationHashStr = attestationHashBigInt.toString();
              return attestationHashStr === codeChallenge;
            }
            return false;
          });
        }

        // Transform events into transaction objects
        const transactions = events
          .filter((event): event is ethers.EventLog => "args" in event)
          .map((event) => {
            const { user, attestationHash, amount, when } = event.args;

            // Convert BigInt timestamp to Date
            const dateTimestamp = Number(when) * 1000; // Convert to milliseconds
            const date = new Date(dateTimestamp);
            const formattedDate = date.toLocaleDateString("en-GB", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            // Keep amount as BigInt in wei, only format for display
            const formattedAmount = parseFloat(
              ethers.formatEther(amount)
            ).toFixed(4);

            const tx = {
              ethHash: event.transactionHash,
              attestationHash: attestationHash.toString(),
              amountWei: amount, // Keep as BigInt (ethers.js already provides this)
              formattedAmount: `${formattedAmount} ETH`, // Only for display
              date: formattedDate,
              dateTimestamp: dateTimestamp,
              user: user,
              blockNumber: event.blockNumber,
            };

            return tx;
          });

        transactions.sort((a, b) => b.dateTimestamp - a.dateTimestamp);

        // console.log("🔍 DEBUG: ETH transactions fetched:", {
        //   count: transactions.length,
        //   transactions: transactions,
        //   codeChallenge: codeChallenge,
        // });

        setEthTransactions(transactions);
      } catch (err) {
        console.error("Error fetching ETH transactions:", err);
        setEthError(
          err instanceof Error ? err.message : "Failed to fetch transactions"
        );
      } finally {
        setEthLoading(false);
      }
    };

    fetchEthTransactions();
  }, [contract, ethAddress, codeChallenge]);

  useEffect(() => {
    // Only update totals after initial loading is complete
    // This prevents showing 0 on initial render before data is fetched
    if (ethLoading || minaLoading) {
      return;
    }

    // Calculate total locked from BigInt wei amounts
    const totalLockedWei = ethTransactions.reduce(
      (sum, tx) => sum + tx.amountWei,
      0n
    );
    const totalLockedETH = Number(totalLockedWei) / 1e18;
    setLockedSoFar(totalLockedETH);

    if (minaTransactions.length > 0) {
      // Calculate total minted from BigInt base units
      const totalMintedBaseUnits = minaTransactions.reduce(
        (sum, tx) => sum + tx.magnitudeBaseUnits,
        0n
      );
      const totalMintedNETH = Number(totalMintedBaseUnits) / 1_000_000;
      setMintedSoFar(totalMintedNETH);
    } else {
      setMintedSoFar(0);
    }
  }, [minaTransactions, ethTransactions, ethLoading, minaLoading]);

  // Memoize matched pairs to prevent recalculation on every render
  // Uses cumulative lock-to-mint matching algorithm
  const matchedPairs = useMemo(() => {
    // Edge case: no transactions
    if (ethTransactions.length === 0) {
      return [];
    }

    // Sort chronologically (oldest first)
    // Note: ethTransactions filtered by ethAddress + codeChallenge
    // minaTransactions filtered by userAccount in API
    const sortedLocks = [...ethTransactions].sort(
      (a, b) => a.dateTimestamp - b.dateTimestamp
    );
    const sortedMints = [...minaTransactions].sort(
      (a, b) => a.dateTimestamp - b.dateTimestamp
    );

    // Initialize tracking variables
    const results: PairResult[] = [];
    let accumulated = 0n; // BigInt accumulator (in nETH bridge token scale: 10^6 base units)
    let mintIndex = 0;
    let groupStartIndex = 0;
    const SCALING_FACTOR = 1_000_000_000_000n; // 10^12 to convert ETH wei to nETH bridge token scale

    // Walk through locks
    for (let lockIndex = 0; lockIndex < sortedLocks.length; lockIndex++) {
      const lock = sortedLocks[lockIndex];

      // Add current lock to accumulated total
      // Convert ETH wei to nETH bridge token scale by dividing by 10^12
      const lockAmountInBridgeTokenScale = lock.amountWei / SCALING_FACTOR;
      accumulated += lockAmountInBridgeTokenScale;

      // Check if accumulated matches current mint
      const currentMint =
        mintIndex < sortedMints.length ? sortedMints[mintIndex] : null;
      const currentMintAmount = currentMint
        ? currentMint.magnitudeBaseUnits
        : 0n;

      if (currentMint && accumulated === currentMintAmount) {
        // Exact match using BigInt

        // Mark all locks in this group as consumed (except the last one)
        for (let i = groupStartIndex; i < lockIndex; i++) {
          results.push({
            ethTx: sortedLocks[i],
            minaTx: null,
            state: "consumed",
          });
        }

        // Mark the last lock in the group as matched (show mint here)
        results.push({
          ethTx: lock,
          minaTx: currentMint,
          state: "matched",
        });

        // Reset for next group
        accumulated = 0n; // BigInt zero
        mintIndex++;
        groupStartIndex = lockIndex + 1;
      }
      // If no match, continue to next iteration (lockIndex will increment)
      // The lock will be handled later if we never find a match
    }

    // Handle remaining locks (no matching mint found)
    // All locks from groupStartIndex onwards are pending
    for (let i = groupStartIndex; i < sortedLocks.length; i++) {
      results.push({
        ethTx: sortedLocks[i],
        minaTx: null,
        state: "pending",
      });
    }

    // console.log("🔍 DEBUG: Cumulative matched pairs:", {
    //   ethCount: ethTransactions.length,
    //   minaCount: minaTransactions.length,
    //   resultsCount: results.length,
    //   matchedCount: results.filter((p) => p.state === 'matched').length,
    //   consumedCount: results.filter((p) => p.state === 'consumed').length,
    //   pendingCount: results.filter((p) => p.state === 'pending').length,
    //   results: results,
    // });åå

    // Reverse to show latest first
    return results.reverse();
  }, [ethTransactions, minaTransactions]);

  if (minaLoading || ethLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white/60">Loading transactions...</p>
      </div>
    );
  }

  if (minaError || ethError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-red-400">Error: {minaError || ethError}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-4/5 my-6 relative">
      {/* div with maskImage below for fading at bottom of table */}
      <div
        className="w-full h-full overflow-auto"
        style={{
          maskImage:
            "linear-gradient(to bottom, black calc(100% - 4rem), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black calc(100% - 4rem), transparent 100%)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left py-3 px-4 text-white/60 font-normal w-1/2">
                Lock transaction
              </th>
              <th className="text-left py-3 px-4 text-white/60 font-normal w-1/2">
                Claim transaction
              </th>
            </tr>
          </thead>
          <tbody>
            {matchedPairs.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-8 text-center text-white/60">
                  No transactions found
                </td>
              </tr>
            ) : (
              matchedPairs.map((pair, index) => (
                <tr
                  key={`pair-${index}`}
                  className="border-b border-white/10 hover:bg-white/5 transition-colors h-full w-full"
                >
                  <td className="pt-4 pb-1 px-4 w-1/2">
                    <div className="text-xs text-white/50">
                      {pair.ethTx?.date}
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <div className="text-base">
                        {formatDisplayAddress(pair.ethTx?.ethHash)}
                      </div>
                      <div className="text-base">
                        {pair.ethTx?.formattedAmount}
                      </div>
                    </div>
                  </td>
                  <td className="pt-4 pb-1 px-4 w-1/2">
                    {pair.state === "matched" && pair.minaTx ? (
                      // Show the actual mint transaction
                      <>
                        <div className="text-xs text-white/50">
                          {pair.minaTx?.date}
                        </div>
                        <div className="flex flex-row justify-between items-center">
                          <div className="text-base">
                            {formatDisplayAddress(pair.minaTx?.minaHash)}
                          </div>
                          <div className="text-base">
                            {pair.minaTx?.nAmount}
                          </div>
                        </div>
                      </>
                    ) : pair.state === "pending" ? (
                      // Show pending/loading state with animation
                      <div className="animate-pulse">
                        <div className="h-3 bg-white/10 rounded w-24 mb-2"></div>
                        <div className="flex flex-row justify-between items-center">
                          <div className="h-4 bg-white/10 rounded w-32"></div>
                          <div className="h-4 bg-white/10 rounded w-20"></div>
                        </div>
                      </div>
                    ) : (
                      // Show consumed state (blank or subtle indicator)
                      <div className="text-xs text-white/30 italic">
                        Included in claim below
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
