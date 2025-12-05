"use client";

import { useEffect, useState, useMemo } from "react";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { useAccount } from "wagmina";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { ethers } from "ethers";
import envConfig from "@/helpers/env.ts";

type TransactionTableProps = {
  setLockedSoFar: (value: number) => void;
  setMintedSoFar: (value: number) => void;
};

const TransactionTable = ({
  setLockedSoFar,
  setMintedSoFar,
}: TransactionTableProps) => {
  const {
    contract,
    walletAddress: ethAddress,
    codeChallenge,
  } = useMetaMaskWallet();
  const [ethTransactions, setEthTransactions] = useState<any[]>([]);
  const [ethLoading, setEthLoading] = useState(false);
  const [ethError, setEthError] = useState<string | null>(null);

  const [minaTransactions, setMinaTransactions] = useState<any[]>([]);
  const [minaLoading, setMinaLoading] = useState(false);
  const [minaError, setMinaError] = useState<string | null>(null);

  const { address: minaAddress } = useAccount();

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
        const url = `https://mina-zkapp-transaction-api.devnet.nori.it.com/api/transactions?zkappAddress=${envConfig.NORI_TOKEN_CONTROLLER_ADDRESS}&userAccount=${minaAddress}&tokenId=${tokenId}&page=1&limit=100`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        const transactions = result.data.map((tx: any) => {
          const magnitude = parseFloat(tx.token_minted || "0");
          const formattedAmount = (magnitude / 1_000_000).toFixed(4);

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
            amount: `${formattedAmount} ETH`,
            nAmount: `${formattedAmount} nETH`,
            date: formattedDate,
            dateTimestamp: dateTimestamp,
            magnitude: magnitude,
            status: tx.status,
          };
        });

        // Sort by date descending (most recent first)
        transactions.sort(
          (a: any, b: any) => b.dateTimestamp - a.dateTimestamp
        );

        setMinaTransactions(transactions);
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
            const attestationHashBigInt = e.args[1];
            const attestationHashStr = attestationHashBigInt.toString();
            return attestationHashStr === codeChallenge;
          });
        }

        // Transform events into transaction objects
        const transactions = events.map((event) => {
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

          // Format amount from Wei to ETH
          const formattedAmount = parseFloat(ethers.formatEther(amount));

          const tx = {
            ethHash: event.transactionHash,
            attestationHash: attestationHash.toString(),
            amount: formattedAmount,
            formattedAmount: `${formattedAmount.toFixed(4)} ETH`,
            nAmount: `${formattedAmount.toFixed(4)} nETH`,
            date: formattedDate,
            dateTimestamp: dateTimestamp,
            user: user,
            blockNumber: event.blockNumber,
          };

          return tx;
        });

        transactions.sort((a, b) => b.dateTimestamp - a.dateTimestamp);

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
    const totalLocked = ethTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    if (minaTransactions.length > 0) {
      const totalMagnitude = minaTransactions.reduce(
        (sum, tx) => sum + tx?.magnitude,
        0
      );
      const totalInStandardUnits = (totalMagnitude ?? 0) / 1_000_000;
      setMintedSoFar(totalInStandardUnits);
    } else {
      setMintedSoFar(0);
    }
    setLockedSoFar(totalLocked ?? 0);
  }, [minaTransactions, ethTransactions]); // Removed setLockedSoFar and setMintedSoFar from dependencies

  // Memoize matched pairs to prevent recalculation on every render
  const matchedPairs = useMemo(() => {
    // Track which Mina transactions have been matched to avoid duplicates
    const usedMinaTxIndices = new Set<number>();

    const pairs = ethTransactions
      .map((tx) => {
        // try exact attestationHash match using calculated codeChallenge
        let matchingMinaTx = null;
        let matchingMinaTxIndex = -1;

        // First priority: Match using our calculated codeChallenge
        if (codeChallenge && tx?.attestationHash === codeChallenge) {
          const index = minaTransactions.findIndex(
            (minaTx, idx) =>
              !usedMinaTxIndices.has(idx) &&
              minaTx?.ethHash &&
              minaTx?.ethHash === codeChallenge
          );
          if (index !== -1) {
            matchingMinaTx = minaTransactions[index];
            matchingMinaTxIndex = index;
          }
        }

        // Second priority: Try direct attestationHash match (for backwards compatibility)
        if (!matchingMinaTx && tx?.attestationHash) {
          const index = minaTransactions.findIndex(
            (minaTx, idx) =>
              !usedMinaTxIndices.has(idx) &&
              minaTx?.ethHash &&
              minaTx?.ethHash === tx?.attestationHash
          );
          if (index !== -1) {
            matchingMinaTx = minaTransactions[index];
            matchingMinaTxIndex = index;
          }
        }

        //If no exact match, try matching by amount and time proximity
        if (!matchingMinaTx) {
          const ethAmount = tx?.amount;
          const ethTime = tx?.dateTimestamp;

          const TIME_WINDOW = 3 * 60 * 60 * 1000;

          let bestMatch = null;
          let bestMatchIndex = -1;
          let smallestTimeDiff = Infinity;

          minaTransactions.forEach((minaTx, idx) => {
            if (usedMinaTxIndices.has(idx)) return;

            const minaAmount = minaTx?.magnitude / 1_000_000;
            const minaTime = minaTx?.dateTimestamp;
            const timeDiff = minaTime - ethTime;

            const amountMatch = Math.abs(minaAmount - ethAmount) < 0.0001;
            const timeMatch = timeDiff >= 0 && timeDiff <= TIME_WINDOW;

            if (amountMatch && timeMatch && timeDiff < smallestTimeDiff) {
              bestMatch = minaTx;
              bestMatchIndex = idx;
              smallestTimeDiff = timeDiff;
            }
          });

          if (bestMatch) {
            matchingMinaTx = bestMatch;
            matchingMinaTxIndex = bestMatchIndex;
          }
        }

        usedMinaTxIndices.add(matchingMinaTxIndex);

        return matchingMinaTx ? { ethTx: tx, minaTx: matchingMinaTx } : null;
      })
      .filter((pair) => pair !== null);

    return pairs;
  }, [ethTransactions, minaTransactions, codeChallenge]);

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
                  No completed transactions found
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
                    <div className="text-xs text-white/50">
                      {pair.minaTx?.date}
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <div className="text-base">
                        {formatDisplayAddress(pair.minaTx?.minaHash)}
                      </div>
                      <div className="text-base">{pair.minaTx?.nAmount}</div>
                    </div>
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
