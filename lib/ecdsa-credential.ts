import { CredentialAttestationWorker } from "@nori-zk/mina-token-bridge/pure-workers";
import { PublicKey } from "o1js";

// Use the pre prepared credential attestation logic.
const credWorker = new CredentialAttestationWorker();

export async function createEcdsaCredential(
  message: string,
  minaPubKey: PublicKey,
  signature: string,
  signerAddress: string,
): Promise<string> {
  try {
    return credWorker.computeCredential(message, signature, signerAddress, minaPubKey.toBase58());
  } catch (error) {
    console.error("Error creating ECDSA credential:", error);
    throw error;
  }
}

export async function compileEcdsaCredentialDependencies(): Promise<void> {
  try {
    await credWorker.compile();
  } catch (error) {
    console.error("Error compiling ECDSA credential dependencies:", error);
    throw error;
  }
}

const noriTokenControllerAddressBase58 = 'B62qjjbAsmyjEYkUQQbwzVLBxUc66cLp48vxgT582UxK15t1E3LPUNs'; // FIXME move this to an environment variable

export async function obtainPresentationRequest(): Promise<string> {
  try {
    return credWorker.computeEcdsaSigPresentationRequest(noriTokenControllerAddressBase58);
  } catch (error) {
    console.error("Error obtaining ECDSA credential:", error);
    throw error;
  }
}

/*
import {
  Credential,
  DynamicBytes,
  Operation,
  Presentation,
  PresentationRequest,
  PresentationSpec,
} from "mina-attestations";

const maxMessageLength = 3;
const proofsEnabled = true;
const Message = DynamicBytes({ maxLength: maxMessageLength });

export async function createEcdsaCredential(
  message: string,
  minaPubKey: PublicKey,
  signature: string,
  signerAddress: string,
  compiledEcdsaCredential: any
): Promise<string> {
  try {
    const { signature: parsedSignature, parityBit } =
      EcdsaEthereum.parseSignature(signature);
    const credential = await compiledEcdsaCredential.create({
      owner: minaPubKey,
      publicInput: {
        signerAddress: EcdsaEthereum.parseAddress(signerAddress),
      },
      privateInput: {
        message: Message.fromString(message),
        signature: parsedSignature,
        parityBit,
      },
    });

    const credentialJson = Credential.toJSON(credential);

    return credentialJson;
  } catch (error) {
    console.error("Error creating ECDSA credential:", error);
    throw error;
  }
}

export async function compileEcdsaCredentialDependencies(): Promise<any> {
  try {
    await EcdsaEthereum.compileDependencies({
      maxMessageLength,
      proofsEnabled,
    });
    const EcdsaCredential = await EcdsaEthereum.Credential({
      maxMessageLength,
    });
    await EcdsaCredential.compile({ proofsEnabled });
    return EcdsaCredential;
  } catch (error) {
    console.error("Error compiling ECDSA credential dependencies:", error);
    throw error;
  }
}

export async function obtainPresentationRequest(
  compiledEcdsaCredential: any
): Promise<string> {
  try {
    const spec = compiledEcdsaCredential.spec;

    const sp = PresentationSpec(
      {
        ecdsaCredential: spec,
      },
      ({ ecdsaCredential }) => ({
        outputClaim: Operation.record({
          owner: Operation.owner,
          issuer: Operation.publicInput(ecdsaCredential as unknown as any), // This needs a better fix
          messageHash: Operation.hash(
            Operation.property(ecdsaCredential as unknown as any, "message") // This needs a better fix
          ),
        }),
      })
    );
    const precompiled = await Presentation.precompile(sp);
    console.log("Precompiled presentation spec:");
    // class ProvablePresentation extends precompiled.ProvablePresentation {}

    const zkapp = PrivateKey.randomKeypair();
    const zkAppAddress = zkapp.publicKey;
    const request = PresentationRequest.zkAppFromCompiled(
      precompiled,
      {
        // expectedHash:
        //   Field.from(
        //     18699229017320908759966161953655543095099977724769778101335726001838446055234
        //   ),
      },
      {
        // this added context ensures that the presentation can't be used outside the target zkApp
        publicKey: zkAppAddress,
        // tokenId: Field(0),
        methodName: "verifyPresentation",
      }
    );
    // request.inputContext.type
    console.log("Presentation request created");
    return PresentationRequest.toJSON(request);
  } catch (error) {
    console.error("Error obtaining ECDSA credential:", error);
    throw error;
  }
}
*/