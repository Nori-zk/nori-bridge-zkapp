import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

const SetupStorage = () => {

  const { state } = useNoriBridge();


  const sendTransaction = async (tx: string) => {
    const fee = (0.1 * 1e9).toString(); // 0.1 MINA in nanomina
    const memo = 'Setting up storage'
    const onlySign = false
    // Should we be using useSendSignedTransaction here?
    const result = await window.mina?.sendTransaction({
      onlySign: onlySign,
      transaction: tx,
      feePayer: {
        fee: fee,
        memo: memo,
      },
    });
    console.log("sendTransaction result: ", result);
  }

  return (
    <button
      // should be disabled if we are in the process of settting up storage
      className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
      // this is now redundant
      /*onClick={async () => {
        if (state.context.setupStorageTransaction) {
          // console.log("setupStorageTransaction changed - this from NoriProvider: ", state.context.setupStorageTransaction);
          sendTransaction(state.context.setupStorageTransaction)
        }
      }}*/
      disabled={true} // !state.context.setupStorageTransaction
    >
      {"Setup Storage"}
    </button>
  )
}

export default SetupStorage;