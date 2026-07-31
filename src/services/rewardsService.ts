/** Rewards API — re-exported from lib/api until httpClients split lands. */
export {
  fetchRewardsReferral,
  fetchRewardsBalance,
  fetchRewardsLedger,
  fetchRewardsCatalog,
  redeemRewards,
  fetchRewardsMonthly,
  type RewardsBalance,
  type RewardsLedgerEntry,
  type RewardsEarnAction,
  type RewardsSpendAction,
  type RewardsCatalog,
  type RewardsRedeemResult,
  type RewardsReferralShare,
  type RewardsMonthlyTotal,
} from '../lib/api';
