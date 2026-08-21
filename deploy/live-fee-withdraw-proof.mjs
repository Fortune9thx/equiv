import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { Wallet } from "ethers";
import fs from "fs";

const FACTORY = "0x3912627184B178d6a23b15F42C252609b6f4945C";
const keystore = fs.readFileSync(process.env.KEYSTORE_PATH, "utf-8");
const wallet = await Wallet.fromEncryptedJson(keystore, process.env.KEYSTORE_PASSWORD);
const owner = createAccount(wallet.privateKey);

const ownerClient = createClient({ chain: testnetBradbury, account: owner });
const readClient = createClient({ chain: testnetBradbury });

const balanceBefore = await readClient.readContract({ address: FACTORY, functionName: "get_balance", args: [] });
const ownerGenBefore = await readClient.getBalance({ address: owner.address });
console.log("factory balance before:", balanceBefore);
console.log("owner GEN balance before:", ownerGenBefore.toString());

console.log("--- calling withdraw_fees ---");
const hash = await ownerClient.writeContract({
  address: FACTORY, functionName: "withdraw_fees", args: [], value: 0n,
});
console.log("tx:", hash);
await ownerClient.waitForTransactionReceipt({ hash, status: "ACCEPTED" });
const tx = await ownerClient.getTransaction({ hash });
console.log("statusName:", tx.statusName, "| result:", tx.txExecutionResultName);
if (tx.txExecutionResultName !== "FINISHED_WITH_RETURN") {
  throw new Error("withdraw_fees did not succeed: " + JSON.stringify(tx));
}

const balanceAfter = await readClient.readContract({ address: FACTORY, functionName: "get_balance", args: [] });
console.log("factory balance after:", balanceAfter);

if (balanceAfter === "0") {
  console.log("PASS: factory balance is now 0 -- fees were actually withdrawn.");
} else {
  console.log("FAIL: factory still holds a balance.");
  process.exit(1);
}
