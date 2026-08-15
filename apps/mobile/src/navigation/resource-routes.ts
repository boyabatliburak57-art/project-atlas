import type { DeepLinkTarget } from './deep-links';

export function resourcePath(target: DeepLinkTarget): string {
  switch (target.kind) {
    case 'symbol':
      return `/symbol/${target.id}`;
    case 'scan-result':
      return `/radar/scanner?runId=${target.id}`;
    case 'watchlist':
      return `/radar/watchlists?resourceId=${target.id}`;
    case 'alert':
      return `/radar/alerts?resourceId=${target.id}`;
    case 'portfolio':
      return `/portfolio/overview?resourceId=${target.id}`;
    case 'strategy':
      return `/research/strategies?resourceId=${target.id}`;
    case 'backtest':
      return `/research/backtests?resourceId=${target.id}`;
    case 'report':
      return `/research/reports?resourceId=${target.id}`;
    case 'support':
      return `/support?resourceId=${target.id}`;
    case 'event':
      return `/research/events/${target.id}`;
    case 'institution':
      return `/markets/institutional/institutions/${target.id}`;
  }
}

export function ownershipPath(target: DeepLinkTarget): string | null {
  switch (target.kind) {
    case 'symbol':
    case 'event':
    case 'institution':
      return null;
    case 'scan-result':
      return `/scanner/runs/${target.id}`;
    case 'watchlist':
      return `/watchlists/${target.id}`;
    case 'alert':
      return `/alerts/${target.id}`;
    case 'portfolio':
      return `/portfolios/${target.id}`;
    case 'strategy':
      return `/strategies/${target.id}`;
    case 'backtest':
      return `/backtests/${target.id}`;
    case 'report':
      return `/reports/${target.id}`;
    case 'support':
      return `/support/requests/${target.id}`;
  }
}
