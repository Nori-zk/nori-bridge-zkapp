import {
  Field,
  SmartContract,
  state,
  State,
  Bool,
  UInt32,
  UInt64,
  method,
  AccountUpdate,
  Provable,
  Int64,
} from 'o1js';

/** Stores  */
export class NoriStorageInterface extends SmartContract {
  @state(Field) userKeyHash = State<Field>();
  @state(Int64) mintedSoFar = State<Field>();

  // @method.returns(Int64)
  // async increaseMintedAmount(lockedSoFar: Int64) {
  //   lockedSoFar.isPositive().assertEquals(true);
  //   Provable.log('not therre yet');
  //   let mintedSoFar = this.mintedSoFar.get();
  //   Provable.log('wegothere', mintedSoFar);
  //   this.mintedSoFar.requireEquals(mintedSoFar);

  //   const amountToMint = lockedSoFar.sub(mintedSoFar);
  //   this.mintedSoFar.set(mintedSoFar.add(amountToMint));
  //   return amountToMint;
  // Provable.log(mintedSoFaraa, 'minted so farrrrrrrr');
  // let amount = totalAmountLockedOnEth.sub(mintedSoFar);
  // this.mintedSoFar.set(mintedSoFar.add(amount));
  // this.self.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
  // return this.self;
  // }
}
