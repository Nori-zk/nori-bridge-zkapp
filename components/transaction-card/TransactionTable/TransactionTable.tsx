"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "urql";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { FIND_MINA_TRANSACTIONS_QUERY } from "@/graphql/operations/queries/mina/transactions.ts";
import { AccountUpdate, ZkappCommand, Block } from "@/types/types.ts";
import { useAccount } from "wagmina";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { ethers } from "ethers";

type TransactionTableProps = {
  setLockedSoFar: (value: number) => void;
  setMintedSoFar: (value: number) => void;
};

const TransactionTable = ({
  setLockedSoFar,
  setMintedSoFar,
}: TransactionTableProps) => {
  const [result] = useQuery({ query: FIND_MINA_TRANSACTIONS_QUERY });
  const { contract, walletAddress: ethAddress } = useMetaMaskWallet();
  //use ethError and ethLoading as using graphQL equivs for MINA
  const [ethTransactions, setEthTransactions] = useState<any[]>([]);
  const [ethLoading, setEthLoading] = useState(false);
  const [ethError, setEthError] = useState<string | null>(null);

  const { data, fetching, error } = result;
  const { address: minaAddress } = useAccount();

  // Transform the data to match your table structure
  const minaTransactions = useMemo(
    () =>
      data?.bestChain
        ?.flatMap((block: Block) => {
          try {
            return block.transactions.zkappCommands
              .filter((cmd: ZkappCommand) => {
                // Check if the transaction was successful (no failure reason)
                if (cmd.failureReason !== null) {
                  return false;
                }
                // Check if the target public key has any balance change > 0
                return cmd.zkappCommand.accountUpdates.some(
                  (update: AccountUpdate) =>
                    update.body.publicKey === minaAddress &&
                    parseFloat(update.body.balanceChange.magnitude) > 0
                );
              })
              .map((cmd: ZkappCommand) => {
                // Find the account update for the target public key with magnitude > 0
                const targetUpdate = cmd.zkappCommand.accountUpdates.find(
                  (update: AccountUpdate) =>
                    update.body.publicKey === minaAddress &&
                    parseFloat(update.body.balanceChange.magnitude) > 0
                );

                // Get the magnitude from the target update
                const magnitude = parseFloat(
                  targetUpdate?.body.balanceChange.magnitude || "0"
                );

                // Format amount (assuming token uses standard decimals)
                const formattedAmount = (magnitude / 1_000_000).toFixed(4);

                // Parse date as timestamp for sorting
                const dateTimestamp = parseInt(
                  block.protocolState.blockchainState.date
                );

                const date = new Date(dateTimestamp);
                const formattedDate = date.toLocaleDateString("en-GB", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const ethHash = cmd.zkappCommand.memo;

                return {
                  ethHash: ethHash,
                  minaHash: targetUpdate?.body.publicKey, // The receiving public key (claim transaction)
                  amount: `${formattedAmount} ETH`,
                  nAmount: `${formattedAmount} nETH`,
                  date: formattedDate,
                  dateTimestamp: dateTimestamp, // Keep timestamp for sorting
                  magnitude: magnitude, // Keep raw magnitude for summing
                };
              });
          } catch (err) {
            console.error("Error fetching MINA transactions:", err);
          }
        })
        .sort((a, b) => b.dateTimestamp - a.dateTimestamp) || [], // Sort by date descending (most recent first)
    [data, minaAddress]
  );

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
        const events = await contract.queryFilter(filter);

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

          return {
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
  }, [contract, ethAddress]);

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
  }, [minaTransactions, ethTransactions, setLockedSoFar, setMintedSoFar]);

  if (fetching || ethLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white/60">Loading transactions...</p>
      </div>
    );
  }

  if (error || ethError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-red-400">Error: {error?.message || ethError}</p>
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
            {(() => {
              // Filter ETH transactions to only those with matching Mina transactions
              const matchedPairs = ethTransactions
                .map((tx) => {
                  // try exact attestationHash match
                  let matchingMinaTx = minaTransactions.find(
                    (minaTx) => minaTx?.ethHash === tx?.attestationHash
                  );

                  //If no exact match, try matching by amount and time proximity
                  if (!matchingMinaTx) {
                    const ethAmount = tx?.amount;
                    const ethTime = tx?.dateTimestamp;

                    // Look for Mina tx with same amount that occurred within 1 hour after ETH tx
                    matchingMinaTx = minaTransactions.find((minaTx) => {
                      const minaAmount = minaTx?.magnitude / 1_000_000;
                      const minaTime = minaTx?.dateTimestamp;
                      const timeDiff = minaTime - ethTime;

                      // Match if amounts are equal and Mina tx is 0-1 hour after ETH tx
                      return (
                        Math.abs(minaAmount - ethAmount) < 0.0001 &&
                        timeDiff >= 0 &&
                        timeDiff <= 1 * 60 * 60 * 1000
                      );
                    });
                  }

                  return matchingMinaTx
                    ? { ethTx: tx, minaTx: matchingMinaTx }
                    : null;
                })
                .filter((pair) => pair !== null);

              if (matchedPairs.length === 0) {
                return (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-white/60">
                      No completed transactions found
                    </td>
                  </tr>
                );
              }

              return matchedPairs.map((pair, index) => (
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
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
