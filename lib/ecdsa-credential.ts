import {
  Credential,
  DynamicBytes,
  Operation,
  Presentation,
  PresentationRequest,
  PresentationSpec,
} from "mina-attestations";
import { EcdsaEthereum } from "mina-attestations/imported";
import { Field, PrivateKey, PublicKey } from "o1js";

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
    await EcdsaEthereum.compileDependencies({
      maxMessageLength,
      proofsEnabled,
    });
    const EcdsaCredential = await EcdsaEthereum.Credential({
      maxMessageLength,
    });
    await EcdsaCredential.compile({ proofsEnabled });
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

export async function compileEcdsaSpec() {
  try {
    await EcdsaEthereum.compileDependencies({
      maxMessageLength,
      proofsEnabled,
    });
    const EcdsaCredential = await EcdsaEthereum.Credential({
      maxMessageLength,
    });
    await EcdsaCredential.compile({ proofsEnabled });

    let spec = EcdsaCredential.spec;

    let sp = PresentationSpec(
      {
        ecdsaCredential: spec,
      },
      ({ ecdsaCredential }) => ({
        outputClaim: Operation.record({
          owner: Operation.owner,
          issuer: Operation.publicInput(ecdsaCredential),
          messageHash: Operation.hash(
            Operation.property(ecdsaCredential, "message")
          ),
        }),
      })
    );
    let precompiled = await Presentation.precompile(sp);

    // class ProvablePresentation extends precompiled.ProvablePresentation {}

    const zkapp = PrivateKey.randomKeypair();
    const zkAppAddress = zkapp.publicKey;
    let request = PresentationRequest.zkAppFromCompiled(
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
    return PresentationRequest.toJSON(request);

    // let deserialized = PresentationRequest.fromJSON("zk-app", requestJson);

    // console.time('create');
    // let presentation = await Presentation.create(minaPubKey, {
    //   request: deserialized,
    //   credentials: [storedCredential],
    //   context: undefined,
    // });
    // console.timeEnd('create');

    // let serialized = Presentation.toJSON(presentation);
    // console.log(
    //   '✅ WALLET: created presentation:',
    //   serialized
    //   // .slice(0, 2000) + '...'
    // );
  } catch (error) {
    console.error("Error compiling ECDSA spec:", error);
  }
}
