import {
  compileEcdsaCredentialDependencies,
  createEcdsaCredential,
} from "@/lib/ecdsa-credential.ts";
import { Mina, PublicKey } from "o1js";
import * as Comlink from "comlink";
import { init } from "next/dist/compiled/webpack/webpack";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  //   AuroInstance: null as null | typeof Auro,
  //   zkappInstance: null as null | Auro,
  transaction: null as null | Transaction,
};

export const api = {
  createEcdsaCredential: async (
    message: string,
    publicKey: string,
    signature: string,
    walletAddress: string
  ): Promise<string> => {
    try {
      const pubKey = PublicKey.fromBase58(publicKey);
      const credential = await createEcdsaCredential(
        message,
        pubKey,
        signature,
        walletAddress
      );
      return credential;
    } catch (error) {
      console.error("Error in worker createEcdsaCredential:", error);
      throw error;
    }
  },

  initialiseCredential: async (): Promise<any> => {
    try {
      console.log("Worker initialiseCredential.");
      const compiledEcdsaCredential =
        await compileEcdsaCredentialDependencies();
      console.log(
        "Finished Worker initialiseCredential.",
        compiledEcdsaCredential
      );
      return compiledEcdsaCredential;
    } catch (error) {
      console.error("Error during worker initialiseCredential:", error);
      throw error;
    }
  },
};

Comlink.expose(api);
