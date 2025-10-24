import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { dummyTransactions } from "@/static_data.ts";

const TransactionTable = () => {
  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/20">
            <th className="text-left py-3 px-4 text-white/60 font-normal">
              Lock transaction
            </th>
            <th className="text-right py-3 px-4 text-white/60 font-normal">
              {""}
            </th>
            <th className="text-left py-3 px-4 text-white/60 font-normal">
              Claim transaction
            </th>
            <th className="text-right py-3 px-4 text-white/60 font-normal">
              {""}
            </th>
          </tr>
        </thead>
        <tbody>
          {dummyTransactions.map((tx, index) => (
            <tr
              key={index}
              className="border-b border-white/10 hover:bg-white/5 transition-colors h-full"
            >
              <td className="py-3 px-4">
                <div className="text-xs text-white/50">{tx.date}</div>
                <div className="text-lg">
                  {formatDisplayAddress(tx.ethHash)}
                </div>
              </td>
              <td className="py-3 px-4 text-lg">
                <span>{tx.amount}</span>
              </td>
              <td className="py-3 px-4">
                <div className="text-xs text-white/50">{tx.date}</div>
                <div className="text-lg">
                  {formatDisplayAddress(tx.minaHash)}
                </div>
              </td>
              <td className="px-4 text-lg h-full flex">{tx.nAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
