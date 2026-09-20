#!/usr/bin/env node
// Repeat `pnpm check` until it exits 0, or until the retry cap.
//
// The loop fixes nothing. It is the detector that the autonomy log names: a red run in
// seconds, repeated, so an agent working at trust level 2 has one command that says
// "done" or "still red" without a human watching each step.
//
// Usage: pnpm check:loop [cap]     (the cap defaults to 5)
// Exit:  0 = green, 1 = the cap was reached, 2 = the loop could not run pnpm at all.
import { spawnSync } from "node:child_process";

const cap = Number.parseInt(process.argv[2] ?? "5", 10);
if (!Number.isInteger(cap) || cap < 1) {
  console.error(`The cap must be a whole number of 1 or more. It was "${process.argv[2]}".`);
  process.exit(2);
}

const started = Date.now();
let iteration = 0;
let status = null;

while (iteration < cap) {
  iteration += 1;
  console.log(`\n=== iteration ${iteration} of ${cap} — pnpm check ===`);

  const run = spawnSync("pnpm", ["check"], { encoding: "utf8", stdio: "inherit" });
  if (run.error) {
    console.error(`The loop could not start pnpm: ${run.error.message}`);
    process.exit(2);
  }

  status = run.status;
  console.log(`=== iteration ${iteration} exit ${status} ===`);
  if (status === 0) break;
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
const reason = status === 0 ? "green: pnpm check exited 0" : `the retry cap of ${cap} was reached`;

console.log(`\niterations: ${iteration}`);
console.log(`stop reason: ${reason}`);
console.log(`last exit code: ${status}`);
console.log(`seconds: ${seconds}`);

process.exit(status === 0 ? 0 : 1);
