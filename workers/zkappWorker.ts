/*import {
  compileEcdsaCredentialDependencies,
  createEcdsaCredential,
  obtainPresentationRequest,
} from "@/lib/ecdsa-credential.ts";*/
import { Mina, PublicKey, Field } from "o1js";
import * as Comlink from "comlink";
import {
  FungibleToken,
  NoriStorageInterface,
  NoriTokenController,
} from "@nori-zk/mina-token-bridge";
import { CredentialAttestationWorker } from "@nori-zk/mina-token-bridge/pure-workers";

const credWorker = new CredentialAttestationWorker();

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

type VerificationKeyData = {
  data: string;
  hash: Field;
};

const state = {
  transaction: null as null | Transaction,
  compiledEcdsaCredential: null as any,
  FungibleToken: null as null | typeof FungibleToken,
  NoriStorageInterface: null as null | typeof NoriStorageInterface,
  NoriTokenController: null as null | typeof NoriTokenController,
  tokenZkapp: null as null | FungibleToken,
  controllerZkapp: null as null | NoriTokenController,
  storageZkapp: null as null | NoriStorageInterface,
  controllerVerificationKey: null as null | VerificationKeyData,
  storageVerificationKey: null as null | VerificationKeyData,
  tokenVerificationKey: null as null | VerificationKeyData,
};

const noriTokenControllerAddressBase58 = 'B62qjjbAsmyjEYkUQQbwzVLBxUc66cLp48vxgT582UxK15t1E3LPUNs'; // FIXME move this to an environment variable

export const api = {
  createEcdsaCredential: async (
    message: string,
    publicKey: string,
    signature: string,
    walletAddress: string
  ): Promise<string> => {
    try {
      //const pubKey = PublicKey.fromBase58(publicKey);
      /*const credential = await createEcdsaCredential(
        message,
        pubKey,
        signature,
        walletAddress,
        state.compiledEcdsaCredential
      );
      return credential;*/
      const cred = credWorker.computeCredential(message, signature, walletAddress, publicKey);
      console.log('computeCredential cred', cred);
      return cred;
    } catch (error) {
      console.error("Error in worker createEcdsaCredential:", error);
      throw error;
    }
  },

  initialiseCredential: async (): Promise<boolean> => {
    try {
      //const compiled = await compileEcdsaCredentialDependencies();
      //state.compiledEcdsaCredential = compiled;
      console.log('Compiling cred deps');
      await credWorker.compile();
      console.log('Compiled cred');
      return true; //compiled !== null;
    } catch (error) {
      console.error("Error during worker initialiseCredential:", error);
      throw error;
    }
  },

  /*loadContracts: async (args: {}) => {
    state.FungibleToken = FungibleToken;
    state.NoriStorageInterface = NoriStorageInterface;
    state.NoriTokenController = NoriTokenController;
  },

  compileContracts: async (args: {}) => {
    const { verificationKey: vkStorage } =
      await state.NoriStorageInterface!.compile();
    const { verificationKey: vkController } =
      await state.NoriTokenController!.compile();
    const { verificationKey: vkToken } = await state.FungibleToken!.compile();
    state.storageVerificationKey = vkStorage;
    state.controllerVerificationKey = vkController;
    state.tokenVerificationKey = vkToken;
  },

  initContractsInstance: async (args: {
    controllerAddress: string;
    tokenAddress: string;
  }) => {
    try {
      console.log(
        "Worker initContractsInstance called with:",
        args.controllerAddress,
        args.tokenAddress
      );
      const controllerAddress = PublicKey.fromBase58(args.controllerAddress);
      const tokenAddress = PublicKey.fromBase58(args.tokenAddress);
      state.controllerZkapp = new state.NoriTokenController!(controllerAddress);
      state.tokenZkapp = new state.FungibleToken!(tokenAddress);
      state.storageZkapp = new state.NoriStorageInterface!(
        controllerAddress, // Use controller address as the user address for storage
        state.controllerZkapp.deriveTokenId()
      );

      return true;
    } catch (error) {
      console.error("Error during worker initContractsInstance:", error);
      return false;
    }
  },

  initialiseTokenContracts: async (): Promise<boolean> => {
    try {
      await api.loadContracts({});
      await api.compileContracts({});
      return (
        state.tokenVerificationKey !== null &&
        state.storageVerificationKey !== null &&
        state.controllerVerificationKey !== null
      );
    } catch (error) {
      console.error("Error during worker initialiseTokenContracts:", error);
      throw error;
    }
  },*/

  obtainPresentationRequest: async (): Promise<string> => {
    try {
      //const credential = await obtainPresentationRequest(state.compiledEcdsaCredential);
      //return credential;
      return credWorker.computeEcdsaSigPresentationRequest(noriTokenControllerAddressBase58);
    } catch (error) {
      console.error("Error obtaining credential:", error);
      throw error;
    }
  },
};

Comlink.expose(api);
