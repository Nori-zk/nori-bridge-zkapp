import {
  AccountUpdate,
  AccountUpdateForest,
  assert,
  Bool,
  DeployArgs,
  Field,
  method,
  Mina,
  Permissions,
  Poseidon,
  PrivateKey,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  Struct,
  TokenContract,
  UInt64,
  UInt8,
  VerificationKey,
} from 'o1js';
import { NoriStorageInterface } from './NoriStorageInterface.js';
import { FungibleToken } from './TokenBase.js';

export type FungibleTokenAdminBase = SmartContract & {
  canMint(accountUpdate: AccountUpdate): Promise<Bool>;
  canChangeAdmin(admin: PublicKey): Promise<Bool>;
  canPause(): Promise<Bool>;
  canResume(): Promise<Bool>;
  canChangeVerificationKey(vk: VerificationKey): Promise<Bool>;
};

export interface NoriTokenControllerDeployProps
  extends Exclude<DeployArgs, undefined> {
  adminPublicKey: PublicKey;
}

export class NoriTokenController
  extends TokenContract
  implements FungibleTokenAdminBase
{
  @state(PublicKey)
  adminPublicKey = State<PublicKey>();

  async deploy(props: NoriTokenControllerDeployProps) {
    await super.deploy(props);
    this.adminPublicKey.set(props.adminPublicKey);
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      editState: Permissions.proof(),
      send: Permissions.proof(),
    });
  }

  approveBase(forest: AccountUpdateForest): Promise<void> {
    throw Error('block updates');
  }
  @method async setUpStorage(user: PublicKey, vk: VerificationKey) {
    let tokenAccUpdate = AccountUpdate.createSigned(user, this.deriveTokenId());
    // TODO: check if it's new account?
    Provable.log('is it new?', tokenAccUpdate.account.isNew.get());

    // TODO assetEqual correct vk
    // could use the idea of vkMap from latest standard
    tokenAccUpdate.body.update.verificationKey = {
      isSome: Bool(true),
      value: vk,
    };
    tokenAccUpdate.body.update.permissions = {
      isSome: Bool(true),
      value: {
        ...Permissions.default(),
        // TODO test acc update for this with sig only
        editState: Permissions.proof(),
        // VK upgradability here?
        setVerificationKey:
          Permissions.VerificationKey.impossibleDuringCurrentVersion(),
        setPermissions: Permissions.proof(), //imposible?
      },
    };

    AccountUpdate.setValue(
      tokenAccUpdate.update.appState[0],
      Poseidon.hash(user.toFields())
    );
  }
  /** Update the verification key.
   * Note that because we have set the permissions for setting the verification key to `impossibleDuringCurrentVersion()`, this will only be possible in case of a protocol update that requires an update.
   */
  @method
  async updateVerificationKey(vk: VerificationKey) {
    this.account.verificationKey.set(vk);
  }

  private async ensureAdminSignature() {
    const admin = await Provable.witnessAsync(PublicKey, async () => {
      let pk = await this.adminPublicKey.fetch();
      assert(pk !== undefined, 'could not fetch admin public key');
      return pk;
    });
    this.adminPublicKey.requireEquals(admin);
    return AccountUpdate.createSigned(admin);
  }

  @method.returns(Bool)
  public async canMint(_accountUpdate: AccountUpdate) {
    // await this.ensureAdminSignature(); //todo
    const amount = _accountUpdate.body.balanceChange;
    Provable.log(amount, 'balance change');
    Provable.log('pubKey', _accountUpdate.publicKey);
    const noriCoreTokenId = this.deriveTokenId();
    Provable.log('noriCoreTokenId in canMint', noriCoreTokenId);
    let storage = new NoriStorageInterface(
      _accountUpdate.publicKey,
      noriCoreTokenId
    );
    let newUpdate = AccountUpdate.createSigned(
      _accountUpdate.publicKey,
      noriCoreTokenId
    );
    newUpdate.account.isNew.requireEquals(Bool(false));
    storage.userKeyHash
      .getAndRequireEquals()
      .assertEquals(Poseidon.hash(_accountUpdate.publicKey.toFields()));
    await storage.increaseMintedAmount(amount);

    return Bool(true);
  }

  @method.returns(Bool)
  public async canChangeAdmin(_admin: PublicKey) {
    await this.ensureAdminSignature();
    return Bool(true);
  }

  @method.returns(Bool)
  public async canPause(): Promise<Bool> {
    await this.ensureAdminSignature();
    return Bool(true);
  }

  @method.returns(Bool)
  public async canResume(): Promise<Bool> {
    await this.ensureAdminSignature();
    return Bool(true);
  }

  @method.returns(Bool)
  public async canChangeVerificationKey(_vk: VerificationKey): Promise<Bool> {
    await this.ensureAdminSignature();
    return Bool(true);
  }
}
