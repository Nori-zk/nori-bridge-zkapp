import React, { useState } from 'react';
import { useNoriBridge } from '@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx';

export const DepositMintTestUI: React.FC = () => {
  const {
    state,
    setDepositNumber,
    setUserAddresses,
    setPresentation,
    initWorker,
    setupStorage,
    submitMintTx,
    retry,
    reset,
    isLoading,
    isReady,
    isError,
    canSetupStorage,
    canSubmitMintTx,
  } = useNoriBridge();

  const [depositNumber, setDepositNumberInput] = useState<string>('12345');
  const [minaAddress, setMinaAddress] = useState<string>('B62qjjbAsmyjEYkUQQbwzVLBxUc66cLp48vxgT582UxK15t1E3LPUNs');
  const [ethAddress, setEthAddress] = useState<string>('0x742d35cc6634c0532925a3b8b84e0e416728c8b6');

  // Mock presentation JSON - in real app this would come from credential storage
  const mockPresentation = JSON.stringify({
    kind: "mock-presentation",
    credential: "mock-credential-data",
    timestamp: Date.now()
  });

  const handleSetDepositNumber = () => {
    const num = parseInt(depositNumber);


    console.log("Setting deposit number to:", num);
    setDepositNumber(num);

  };

  const handleSetAddresses = () => {
    if (minaAddress && ethAddress) {
      setUserAddresses(minaAddress, ethAddress);
    }
  };

  const handleSetPresentation = () => {
    setPresentation(mockPresentation);
  };

  const getStateDisplay = () => {
    if (typeof state.value === 'string') {
      return state.value;
    }
    return JSON.stringify(state.value);
  };

  const getStatusColor = () => {
    if (isError) return 'text-red-600';
    if (isLoading) return 'text-yellow-600';
    if (isReady) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Deposit → Mint Flow Test</h1>

      {/* Current State Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current State</h2>
        <div className={`font-mono text-sm ${getStatusColor()}`}>
          State: <span className="font-bold">{getStateDisplay()}</span>
        </div>
        {isLoading && <div className="text-yellow-600 mt-1">⏳ Loading...</div>}
        {isError && (
          <div className="text-red-600 mt-1">
            ❌ Error: {state.context.errorMessage}
          </div>
        )}
        {isReady && <div className="text-green-600 mt-1">✅ Ready</div>}
      </div>

      {/* Configuration Section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">1. Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deposit Block Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={depositNumber}
                onChange={(e) => setDepositNumberInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="e.g., 12345"
              />
              <button
                onClick={handleSetDepositNumber}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Set
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Current: {state.context.activeDepositNumber || 'Not set'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mina Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={minaAddress}
                onChange={(e) => setMinaAddress(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-xs"
                placeholder="B62..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ethereum Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ethAddress}
                onChange={(e) => setEthAddress(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-xs"
                placeholder="0x..."
              />
            </div>
          </div>

          <div>
            <button
              onClick={handleSetAddresses}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Set Addresses
            </button>
            <div className="text-xs text-gray-500 mt-1">
              Mina: {state.context.minaSenderAddress ? '✅ Set' : '❌ Not set'}
              <br />
              ETH: {state.context.ethSenderAddress ? '✅ Set' : '❌ Not set'}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSetPresentation}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
          >
            Set Mock Presentation
          </button>
          <div className="text-xs text-gray-500 mt-1">
            Presentation: {state.context.presentationJsonStr ? '✅ Set' : '❌ Not set'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">2. Actions</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={initWorker}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔧 Init Worker
          </button>

          <button
            onClick={setupStorage}
            disabled={!canSetupStorage || isLoading}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💾 Setup Storage
          </button>

          <button
            onClick={submitMintTx}
            disabled={!canSubmitMintTx || isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Submit Mint Tx
          </button>

          <button
            onClick={retry}
            disabled={!isError}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Retry
          </button>

          <button
            onClick={reset}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            🗑️ Reset
          </button>
        </div>
      </div>

      {/* Status Information */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">3. Status Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Worker Status</h3>
            <div>Ready: {state.context.isWorkerReady ? '✅' : '❌'}</div>
            <div>Storage Setup: {state.context.isStorageSetup ? '✅' : '❌'}</div>
            <div>Needs Funding: {state.context.needsToFundAccount ? '⚠️ Yes' : '✅ No'}</div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Bridge Status</h3>
            <div>Processing: {state.context.processingStatus?.deposit_processing_status || 'Not monitoring'}</div>
            <div>Can Compute: {state.context.canComputeStatus || 'Not monitoring'}</div>
            <div>Can Mint: {state.context.canMintStatus || 'Not monitoring'}</div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Progress</h3>
            <div>ETH Proof: {state.context.computedEthProof ? '✅ Computed' : '❌ Not computed'}</div>
            <div>Mint Tx: {state.context.depositMintTx ? '✅ Built' : '❌ Not built'}</div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Action States</h3>
            <div>Can Setup Storage: {canSetupStorage ? '✅' : '❌'}</div>
            <div>Can Submit Mint: {canSubmitMintTx ? '✅' : '❌'}</div>
            <div>Is Loading: {isLoading ? '⏳' : '✅'}</div>
          </div>
        </div>
      </div>


    </div>
  );
};