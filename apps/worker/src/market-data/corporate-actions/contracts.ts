export const CORPORATE_ACTION_TYPES = [
  'split',
  'reverseSplit',
  'bonusShare',
  'cashDividend',
  'rightsIssue',
  'symbolChange',
  'mergerAcquisition',
  'delisting',
] as const;

export type CorporateActionType = (typeof CORPORATE_ACTION_TYPES)[number];

export interface ProviderCorporateAction {
  readonly providerEventId: string;
  readonly providerSymbol: string;
  readonly type: CorporateActionType;
  readonly announcementAt: Date;
  readonly exAt: Date | null;
  readonly recordAt: Date | null;
  readonly paymentAt: Date | null;
  readonly effectiveAt: Date;
  readonly availableAt: Date;
  readonly sourceTimestamp: Date;
  readonly providerRevision: string;
  readonly factor: string | null;
  readonly cashPerShare: string | null;
  readonly subscriptionPrice: string | null;
  readonly currencyCode: string | null;
  readonly oldSymbol: string | null;
  readonly newSymbol: string | null;
  readonly successorSymbol: string | null;
}

export type CorporateActionAdjustmentPolicy =
  | 'rawPricesAndPositionActions'
  | 'splitAdjustedPrices'
  | 'totalReturnAdjustedPrices';

export function shouldApplyCorporateAction(
  action: ProviderCorporateAction,
  policy: CorporateActionAdjustmentPolicy,
): boolean {
  if (
    ['split', 'reverseSplit', 'bonusShare'].includes(action.type) &&
    policy !== 'rawPricesAndPositionActions'
  )
    return false;
  if (action.type === 'cashDividend' && policy === 'totalReturnAdjustedPrices')
    return false;
  return true;
}
