import { dummyTransactions } from "@/static_data.ts";

const TransactionTable = () => {
  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/20">
            <th className="text-left py-3 px-4 text-white/60 font-normal">Hash</th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">Status</th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">Amount</th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">Date</th>
          </tr>
        </thead>
        <tbody>
          {dummyTransactions.map((tx, index) => (
            <tr
              key={tx.hash}
              className="border-b border-white/10 hover:bg-white/5 transition-colors"
            >
              <td className="py-3 px-4 font-mono text-lightGreen">
                {formatHash(tx.hash)}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    tx.status === "Completed"
                      ? "bg-lightGreen/20 text-lightGreen"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {tx.status}
                </span>
              </td>
              <td className="py-3 px-4">{tx.amount}</td>
              <td className="py-3 px-4 text-white/60">{tx.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
