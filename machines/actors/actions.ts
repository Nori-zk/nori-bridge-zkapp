"use client";
import type ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import { fromPromise } from "xstate";
import { EthProofResult } from "../types.ts";
import { Store } from "@/helpers/localStorage2.ts";

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
    //@ts-expect-error // mina provider client is bit odd
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
    let codeVerify = Store.forEth(
      input.worker.ethWalletPubKeyBase58,
    ).codeVerifier;

    if (codeVerify === null) {
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [
          input.worker.fixedValueOrSecret,
          input.worker.ethWalletPubKeyBase58!,
        ],
      });
      const createdCodeVerify =
        await input.worker.getCodeVerifyFromEthSignature(signature);
      Store.forEth(
        input.worker.ethWalletPubKeyBase58,
      ).codeVerifier = createdCodeVerify;
      codeVerify = createdCodeVerify;
    }

    const codeChallange = await input.worker.createCodeChallenge(codeVerify!);
    console.log("about to computeEthProof with codeChallange", codeChallange);
    const ethProof =
      await input.worker.computeDepositAttestationWitnessAndEthVerifier(
        codeChallange!,
        input.depositBlockNumber
      );

    // Store in localStorage using the new helper
    Store.forPair(
      input.worker.ethWalletPubKeyBase58,
      input.worker.minaWalletPubKeyBase58,
    ).computedEthProof = JSON.stringify(ethProof);
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
    const state = Store.forPair(
      input.worker.ethWalletPubKeyBase58,
      input.worker.minaWalletPubKeyBase58
    ).computedEthProof;
    const codeVerify = Store.forEth(
      input.worker.ethWalletPubKeyBase58,
    ).codeVerifier;
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

    // Store in localStorage using the new helper
    Store.forPair(
      input.worker.ethWalletPubKeyBase58,
      input.worker.minaWalletPubKeyBase58,
    ).depositMintTx = mintTxStr;
    return mintTxStr; //JSON of tx that we need to send to wallet - to componet/provider
  }
);

export const submitMintTx = fromPromise(
  async ({ input }: { input: { mintTx: string } }) => {
    // In a real implementation, this would submit the transaction to the Mina network
    console.log("Submitting mint transaction");

    const fee = (0.1 * 1e9).toString(); // 0.1 MINA in nanomina
    const memo = "Submit mint tx";
    const onlySign = false;
    //@ts-expect-error // mina provider client is bit odd
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