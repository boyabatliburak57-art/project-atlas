export interface NotificationFoundation {
  readonly productionDeliveryConfigured: false;
  readonly supportedTargets: readonly [
    'symbol',
    'alert',
    'scan-result',
    'watchlist',
    'portfolio',
    'backtest',
    'report',
  ];
}

export const notificationFoundation: NotificationFoundation = {
  productionDeliveryConfigured: false,
  supportedTargets: [
    'symbol',
    'alert',
    'scan-result',
    'watchlist',
    'portfolio',
    'backtest',
    'report',
  ],
};
