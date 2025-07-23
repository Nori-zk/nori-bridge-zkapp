import { Credential, DynamicBytes } from "mina-attestations";
import { EcdsaEthereum } from "mina-attestations/imported";
import { PublicKey } from "o1js";

const maxMessageLength = 3;
const proofsEnabled = false;
const Message = DynamicBytes({ maxLength: maxMessageLength });

export async function createEcdsaCredential(
  message: string,
  minaPubKey: PublicKey,
  signature: string,
  signerAddress: string
): Promise<string> {
  try {
    const { signature: parsedSignature, parityBit } =
      EcdsaEthereum.parseSignature(signature);
    const credential = await EcdsaCredential.create({
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
