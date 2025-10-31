"use client";

import { useQuery } from "urql";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { FIND_TRANSACTIONS_QUERY } from "@/graphql/operations/queries/transactions.ts";

interface BalanceChange {
  magnitude: string;
  sgn: string;
}

interface AccountUpdate {
  body: {
    publicKey: string;
    tokenId: string;
    balanceChange: BalanceChange;
  };
}

interface ZkappCommand {
  hash: string;
  zkappCommand: {
    memo: string;
    accountUpdates: AccountUpdate[];
  };
}

interface Block {
  stateHash: string;
  protocolState: {
    blockchainState: {
      date: string;
    };
  };
  transactions: {
    zkappCommands: ZkappCommand[];
  };
}

const TransactionTable = () => {
  const [result] = useQuery({ query: FIND_TRANSACTIONS_QUERY });

  const { data, fetching, error } = result;

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

  // Transform the data to match your table structure
  const transactions =
    data?.bestChain?.flatMap((block: Block) =>
      block.transactions.zkappCommands.map((cmd: ZkappCommand) => {
        // Calculate total amount from balance changes
        const totalAmount = cmd.zkappCommand.accountUpdates.reduce(
          (sum: number, update: AccountUpdate) => {
            const magnitude =
              parseFloat(update.body.balanceChange.magnitude) || 0;
            const sgn = update.body.balanceChange.sgn;
            return sum + (sgn === "Positive" ? magnitude : -magnitude);
          },
          0
        );

        // Format amount (Mina uses 9 decimal places - nanomina)
        const formattedAmount = (totalAmount / 1_000_000_000).toFixed(4);

        // Format date
        const date = new Date(
          parseInt(block.protocolState.blockchainState.date)
        );
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          hash: cmd.hash,
          status: "Completed", // All transactions in bestChain are completed
          amount: `${formattedAmount} MINA`,
          date: formattedDate,
          memo: cmd.zkappCommand.memo,
        };
      })
    ) || [];

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/20">
            <th className="text-left py-3 px-4 text-white/60 font-normal">
              Hash
            </th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">
              Status
            </th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-white/60">
                No transactions found
              </td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr
                key={tx.hash}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-4 font-mono text-lightGreen">
                  {formatDisplayAddress(tx.hash)}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded text-xs bg-lightGreen/20 text-lightGreen">
                    {tx.status}
                  </span>
                </td>
                <td className="py-3 px-4">{tx.amount}</td>
                <td className="py-3 px-4 text-white/60">{tx.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
