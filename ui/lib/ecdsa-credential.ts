import { Credential, DynamicBytes } from "mina-attestations";
import { EcdsaEthereum } from "mina-attestations/imported";
import { PublicKey } from "o1js";

const maxMessageLength = 3; // not maximum but actual length of the message
const proofsEnabled = true;
const Message = DynamicBytes({ maxLength: maxMessageLength });

export async function createEcdsaCredential(
  message: string,
  minaPubKey: PublicKey,
  signature: string,
  signerAddress: string
): Promise<string> {
  try {
    console.time("compileDependencies");
    await EcdsaEthereum.compileDependencies({
      maxMessageLength,
      proofsEnabled,
    });
    console.timeEnd("compileDependencies");
    const EcdsaCredential = await EcdsaEthereum.Credential({
      maxMessageLength,
    });
    console.time("compileEcdsaCredential");
    await EcdsaCredential.compile({ proofsEnabled });
    console.timeEnd("compileEcdsaCredential");
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
