"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "urql";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { FIND_TRANSACTIONS_QUERY } from "@/graphql/operations/queries/transactions.ts";
import { AccountUpdate, ZkappCommand, Block } from "@/types/types.ts";
import { useAccount } from "wagmina";

type TransactionTableProps = {
  setLockedSoFar: (value: number) => void;
  setMintedSoFar: (value: number) => void;
};

const TransactionTable = ({
  setLockedSoFar,
  setMintedSoFar,
}: TransactionTableProps) => {
  const [result] = useQuery({ query: FIND_TRANSACTIONS_QUERY });

  const { data, fetching, error } = result;
  const { address: minaAddress } = useAccount();

  // Transform the data to match your table structure
  const transactions = useMemo(
    () =>
      data?.bestChain
        ?.flatMap((block: Block) =>
          block.transactions.zkappCommands
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
            })
        )
        .sort((a, b) => b.dateTimestamp - a.dateTimestamp) || [], // Sort by date descending (most recent first)
    [data, minaAddress]
  );

  // Calculate and update the total locked and minted amounts
  useEffect(() => {
    if (transactions.length > 0) {
      const totalMagnitude = transactions.reduce(
        (sum, tx) => sum + tx.magnitude,
        0
      );
      // Convert from token smallest unit to standard unit
      const totalInStandardUnits = totalMagnitude / 1_000_000;

      setLockedSoFar(0.111);
      setMintedSoFar(totalInStandardUnits);
    } else {
      setLockedSoFar(0);
      setMintedSoFar(0);
    }
  }, [transactions, setLockedSoFar, setMintedSoFar]);

  if (fetching) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white/60">Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-red-400">Error: {error.message}</p>
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
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-8 text-center text-white/60">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => {
                return (
                  <tr
                    key={index}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors h-full w-full"
                  >
                    <td className="pt-4 pb-1 px-4 w-1/2">
                      <div className="text-xs text-white/50">{tx.date}</div>
                      <div className="flex flex-row justify-between items-center">
                        {/*use base text rather than md*/}
                        <div className="text-base">
                          {formatDisplayAddress(tx.ethHash)}
                        </div>
                        <div className="text-base">{tx.amount}</div>
                      </div>
                    </td>
                    <td className="pt-4 pb-1 px-4 w-1/2">
                      <div className="text-xs text-white/50">{tx.date}</div>
                      <div className="flex flex-row justify-between items-center">
                        <div className="text-base">
                          {formatDisplayAddress(tx.minaHash)}
                        </div>
                        <div className="text-base">{tx.nAmount}</div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
