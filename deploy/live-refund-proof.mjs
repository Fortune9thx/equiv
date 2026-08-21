import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const FACTORY = "0x3912627184B178d6a23b15F42C252609b6f4945C";
const creator = createAccount(process.env.ACCOUNT1_KEY);
const staker = createAccount(process.env.ACCOUNT2_KEY);

const creatorClient = createClient({ chain: testnetBradbury, account: creator });
const stakerClient = createClient({ chain: testnetBradbury, account: staker });
const readClient = createClient({ chain: testnetBradbury });

async function waitAccepted(client, hash, label) {
  console.log(`[${label}] tx: ${hash}`);
  await client.waitForTransactionReceipt({ hash, status: "ACCEPTED" });
  const tx = await client.getTransaction({ hash });
  console.log(`[${label}] statusName=${tx.statusName} result=${tx.txExecutionResultName}`);
  if (tx.txExecutionResultName !== "FINISHED_WITH_RETURN") {
    throw new Error(`${label} did not succeed: ${JSON.stringify(tx)}`);
  }
  return tx;
}

const endTime = Math.floor(Date.now() / 1000) + 40;

console.log("--- deploying claim ---");
const deployHash = await creatorClient.writeContract({
  address: FACTORY,
  functionName: "deploy_claim",
  args: [
    "Live refund-path probe: is 2 + 2 equal to 5?",
    "Resolves NO if standard arithmetic confirms 2 + 2 does not equal 5.",
    ["YES", "NO"],
    endTime,
    ["https://en.wikipedia.org/wiki/Elementary_arithmetic"],
    [],
    [],
  ],
  value: 1_000_000_000_000_000_000n, // 1 GEN creation stake
});
await waitAccepted(creatorClient, deployHash, "deploy_claim");

const claims = await readClient.readContract({
  address: FACTORY, functionName: "get_claims_by_creator", args: [creator.address],
});
const claimAddress = claims[claims.length - 1];
console.log("claim address:", claimAddress);

console.log("--- staking 0.01 GEN on YES (the losing side) ---");
const stakeHash = await stakerClient.writeContract({
  address: claimAddress,
  functionName: "take_position",
  args: ["YES"],
  value: 10_000_000_000_000_000n, // 0.01 GEN
});
await waitAccepted(stakerClient, stakeHash, "take_position");

console.log("--- waiting for end_time ---");
await new Promise((r) => setTimeout(r, 45_000));

console.log("--- resolving ---");
const resolveHash = await creatorClient.writeContract({
  address: claimAddress, functionName: "resolve", args: [], value: 0n,
});
await waitAccepted(creatorClient, resolveHash, "resolve");

const claim = await readClient.readContract({ address: claimAddress, functionName: "get_claim", args: [] });
console.log("resolved_outcome:", claim.resolved_outcome, "| status:", claim.status);

console.log("--- claiming payout ---");
const payoutHash = await stakerClient.writeContract({
  address: claimAddress, functionName: "claim_payout", args: [], value: 0n,
});
await waitAccepted(stakerClient, payoutHash, "claim_payout");

const position = await readClient.readContract({
  address: claimAddress, functionName: "get_position", args: [staker.address],
});
console.log("staker position after claim:", JSON.stringify(position));

if (position.payout === "10000000000000000" && position.claimed === true) {
  console.log("PASS: staker was refunded their full stake, not paid zero.");
} else {
  console.log("FAIL: unexpected payout/claimed state.");
  process.exit(1);
}
