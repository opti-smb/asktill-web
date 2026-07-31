/**
 * Smoke tests for @asktill/calculators pure math.
 * Run: npm test --workspace=@asktill/calculators
 *   or: npx tsx packages/calculators/scripts/test-calculators.ts
 */
import {
  calcCashRunway,
  calcBreakEven,
  calcGrossMargin,
  DAYS_PER_MONTH,
} from '../src/index.ts';

let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

const runway = calcCashRunway(30_000, 10_000);
assert(runway != null, 'cash runway returns a result');
assert(runway != null && Math.abs(runway.days - (30_000 / (10_000 / DAYS_PER_MONTH))) < 0.01, 'cash runway days formula');
assert(runway != null && Math.abs(runway.months - 3) < 0.01, 'cash runway ~3 months');

const be = calcBreakEven(5000, 40);
assert(be != null, 'break-even returns a result');

const gm = calcGrossMargin(100_000, 60_000);
assert(gm != null && Math.abs(gm.accountingMarginPct - 40) < 0.01, 'gross margin ~40%');

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll calculator smoke tests passed.');
