import { Client, cacheExchange, fetchExchange } from "urql";

export const urqlClient = new Client({
  url: "https://api.minascan.io/node/devnet/v1/graphql",
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  },
});
