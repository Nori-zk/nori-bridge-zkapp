"use client";
import { LS_KEYS, makeKeyPairLSKey } from "@/helpers/localStorage.ts";
import type ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import { fromPromise } from "xstate";
import { EthProofResult } from "../types.ts";

export const checkStorageSetupOnChain = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
    };
  }) => {
    try {
      console.log(
        "Checking storage setup for address eth:",
        input.worker.ethWalletPubKeyBase58
      );
      console.log(
        "Checking storage setup for address mina:",
        input.worker.minaWalletPubKeyBase58
      );
      //TODO store and then fetch if needSetup from localStorage
      return input.worker.needsToSetupStorage();
    } catch (err) {
      console.log("Error in checkStorageSetupOnChain: ", err);
    }
  }
);

export const setupStorage = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
    };
  }) => {
    const txStr = await input.worker.setupStorage();
    console.log("Storage setup transactionready");
    return txStr;
  }
);

export const submitSetupStorage = fromPromise(
  async ({
    input,
  }: {
    input: {
      setupStorageTx: string;
    };
  }) => {
    const { setupStorageTx } = input;
    const fee = (0.1 * 1e9).toString(); // 0.1 MINA in nanomina
    const memo = "Setting up storage";
    const onlySign = false;
    // Should we be using useSendSignedTransaction here?
    const result = await window.mina?.sendTransaction({
      onlySign: onlySign,
      transaction: setupStorageTx,
      feePayer: {
        fee: fee,
        memo: memo,
      },
    });
    console.log("sendTransaction result: ", result);
    return result;
  }
);

export const computeEthProof = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
      depositBlockNumber: number;
    };
  }) => {
    const codeVerify = localStorage.getItem(
      makeKeyPairLSKey(
        "codeVerifier",
        input.worker.ethWalletPubKeyBase58,
        input.worker.minaWalletPubKeyBase58
      )
    );
    const codeChallange = await input.worker.createCodeChallenge(codeVerify!);
    console.log("about to computeEthProof with codeChallange", codeChallange);
    const ethProof =
      await input.worker.computeDepositAttestationWitnessAndEthVerifier(
        codeChallange!,
        input.depositBlockNumber
      );

    // Store in localStorage
    localStorage.setItem(LS_KEYS.computedEthProof, JSON.stringify(ethProof));
    // localStorage.setItem(LS_KEYS.lastEthProofCompute, Date.now().toString());
    console.log(
      "Computed ethProof value :",
      ethProof.depositAttestationInput.despositSlotRaw.value
    );
    return ethProof;
  }
);

export const computeMintTx = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
      // ethProof: JsonProof; // from localStorage
      // needsToFundAccount: boolean;
    };
  }) => {
    const state = localStorage.getItem(LS_KEYS.computedEthProof);
    const codeVerify = localStorage.getItem(
      makeKeyPairLSKey(
        "codeVerifier",
        input.worker.ethWalletPubKeyBase58,
        input.worker.minaWalletPubKeyBase58
      )
    );
    console.log("codeVerifier", codeVerify);
    const needsToFundAccount = await input.worker.needsToFundAccount();
    console.log("needsToFundAccount", needsToFundAccount);
    if (!state || !codeVerify)
      throw new Error("No stored eth proof or codeVerify found");
    const storedProof = JSON.parse(state) as EthProofResult;
    const mintTxStr = await input.worker.computeMintTx(
      storedProof.ethVerifierProofJson,
      storedProof.depositAttestationInput,
      codeVerify,
      needsToFundAccount
    );

    // Store in localStorage
    localStorage.setItem(LS_KEYS.depositMintTx, mintTxStr);
    return mintTxStr; //JSON of tx that we need to send to wallet - to componet/provider
  }
);

export const submitMintTx = fromPromise(
  async ({ input }: { input: { mintTx: string } }) => {
    // In a real implementation, this would submit the transaction to the Mina network
    console.log("Submitting mint transaction:", input.mintTx);

    const fee = (0.1 * 1e9).toString(); // 0.1 MINA in nanomina
    const memo = "Submit mint tx";
    const onlySign = false;
    const result = await window.mina?.sendTransaction({
      // FIXME this is not done in an idiomatic react way, and the type is incomplete.
      onlySign: onlySign,
      transaction: input.mintTx,
      feePayer: {
        fee: fee,
        memo: memo,
      },
    });

    console.log("submit mint tx result", result);
    return true;
  }
);
