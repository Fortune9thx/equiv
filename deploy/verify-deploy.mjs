#!/usr/bin/env node
/**
 * Post-deploy sanity check: confirms a ClaimFactory address is actually
 * readable, not just "looks deployed." Worth running after every deploy --
 * a prior GenLayer project on this network found cases where a deploy
 * transaction reaches ACCEPTED/executes successfully but the contract
 * becomes permanently unreadable afterward (see genlayer-allow-storage-broken
 * notes). get_claims_count() on a fresh factory should return 0.
 *
 * Usage: node deploy/verify-deploy.mjs 0xClaimFactoryAddress
 */
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const address = process.argv[2];
if (!address) throw new Error("Usage: node verify-deploy.mjs <ClaimFactory address>");

const client = createClient({ chain: testnetBradbury });

const count = await client.readContract({
  address,
  functionName: "get_claims_count",
  args: [],
});
console.log(`get_claims_count() at ${address}:`, count);
console.log(count === 0 || count === "0" ? "Readable and empty, as expected for a fresh deploy." : "Readable.");
