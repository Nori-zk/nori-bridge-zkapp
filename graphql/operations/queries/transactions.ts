import { gql } from "urql";

export const FIND_TRANSACTIONS_QUERY = gql`
  query findTransactions {
    bestChain(maxLength: 250) {
      stateHash
      protocolState {
        blockchainState {
          date
        }
      }
      transactions {
        zkappCommands {
          hash
          zkappCommand {
            memo
            accountUpdates {
              body {
                publicKey
                tokenId
                balanceChange {
                  magnitude
                  sgn
                }
              }
            }
          }
        }
      }
    }
  }
`;
