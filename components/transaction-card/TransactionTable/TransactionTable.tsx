import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { dummyTransactions } from "@/static_data.ts";

const TransactionTable = () => {
  return (
    <div className="w-full h-3/4 my-6 relative">
      <div className="w-full h-full overflow-auto">
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
            {dummyTransactions.map((tx, index) => (
              <tr
                key={index}
                className="border-b border-white/10 hover:bg-white/5 transition-colors h-full w-full"
              >
                <td className="pt-4 pb-1 px-4 w-1/2">
                  <div className="text-xs text-white/50">{tx.date}</div>
                  <div className="flex flex-row justify-between items-center">
                    <div className="text-lg">
                      {formatDisplayAddress(tx.ethHash)}
                    </div>
                    <div className="text-lg">{tx.amount}</div>
                  </div>
                </td>
                <td className="pt-4 pb-1 px-4 w-1/2">
                  <div className="text-xs text-white/50">{tx.date}</div>
                  <div className="flex flex-row justify-between items-center">
                    <div className="text-lg">
                      {formatDisplayAddress(tx.minaHash)}
                    </div>
                    <div className="text-lg">{tx.nAmount}</div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
