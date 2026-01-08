import { JsonProof } from "o1js";
import { Observable } from "rxjs";

// Generic types
export type ObservableValue<T> = T extends Observable<infer U> ? U : never;

// Eth proof type
export type EthProofResult = {
  ethVerifierProofJson: JsonProof;
  depositAttestationInput: {
    path: string[];
    depositIndex: number;
    rootHash: string;
    despositSlotRaw: {
      slot_key_address: string;
      slot_nested_key_attestation_hash: string;
      value: string;
    };
  };
};

