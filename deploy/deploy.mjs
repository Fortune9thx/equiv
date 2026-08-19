#!/usr/bin/env node
/**
 * Deploys ClaimFactory with the real Claim.py source embedded as its
 * constructor argument, exactly matching the verified genlayerlabs
 * "Registry" factory pattern (see contracts/ClaimFactory.py's docstring).
 *
 * Written directly against genlayer-js rather than the `genlayer` CLI:
 * the CLI's --args parser calls JSON.parse() on every argument and
 * substitutes the parsed value when it succeeds, with no string escape
 * hatch. Claim.py's full source is a large string that trivially confuses
 * that parser, and there's no way around it from the CLI side -- see
 * genlayer-cli-tooling-gotchas notes. A plain node script keeps every
 * argument's real type intact.
 *
 * Usage:
 *   PRIVATE_KEY=0x... CREATION_FEE_WEI=0 node deploy/deploy.mjs
 *
 * Or, to use a genlayer CLI keystore (~/.genlayer/keystores/*.json) instead
 * of a raw private key -- the key is decrypted in-process via ethers and
 * never written to disk, printed, or passed as a CLI argument:
 *   KEYSTORE_PATH=/path/to/keystore.json KEYSTORE_PASSWORD=... CREATION_FEE_WEI=0 node deploy/deploy.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { Wallet } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLAIM_PATH = path.join(__dirname, "..", "contracts", "Claim.py");
const FACTORY_PATH = path.join(__dirname, "..", "contracts", "ClaimFactory.py");

async function resolvePrivateKey() {
  if (process.env.PRIVATE_KEY) return process.env.PRIVATE_KEY;

  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  if (keystorePath && keystorePassword) {
    const keystoreJson = readFileSync(keystorePath, "utf-8");
    const wallet = await Wallet.fromEncryptedJson(keystoreJson, keystorePassword);
    return wallet.privateKey;
  }

  throw new Error(
    "Set PRIVATE_KEY, or both KEYSTORE_PATH and KEYSTORE_PASSWORD, in the environment before deploying."
  );
}

async function main() {
  const privateKey = await resolvePrivateKey();
  const creationFeeWei = BigInt(process.env.CREATION_FEE_WEI ?? "0");

  const claimSource = readFileSync(CLAIM_PATH, "utf-8");
  const factorySource = readFileSync(FACTORY_PATH, "utf-8");

  const account = createAccount(privateKey);
  const client = createClient({ chain: testnetBradbury, account });

  console.log(`Deploying ClaimFactory (Claim.py source: ${claimSource.length} bytes)…`);

  const deployHash = await client.deployContract({
    code: factorySource,
    args: [claimSource, creationFeeWei],
  });
  console.log(`Deploy tx: ${deployHash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployHash,
    status: TransactionStatus.FINALIZED,
  });

  // genlayer-js@1.1.8's GenLayerTransaction type puts the deployed address at
  // txDataDecoded.contractAddress (DecodedDeployData) -- verified by reading
  // the installed package's own .d.ts, not assumed.
  const factoryAddress = receipt.txDataDecoded?.contractAddress ?? receipt.contractAddress;
  if (!factoryAddress) {
    throw new Error(`Could not read contract address from receipt: ${JSON.stringify(receipt)}`);
  }

  console.log(`ClaimFactory deployed at: ${factoryAddress}`);

  const envPath = path.join(__dirname, "..", "frontend", ".env.local");
  const envLine = `NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS=${factoryAddress}\n`;
  writeFileSync(envPath, envLine, { flag: "a" });
  console.log(`Appended NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS to ${envPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
