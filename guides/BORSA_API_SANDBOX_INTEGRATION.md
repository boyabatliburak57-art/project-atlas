# borsa-api Sandbox Integration

## Status

`borsa-api` is a credential-free `SANDBOX_INTEGRATION` backed by delayed,
third-party public data. It is not an official Borsa İstanbul feed, has no
commercial display or redistribution approval, and is not production eligible.
The worker rejects production selection even if
`BORSA_API_ALLOW_IN_PRODUCTION=true` is supplied.

User-facing attribution is `borsa-api / üçüncü taraf gecikmeli veri`; it must
never be described as real-time or official BIST data.

## Capability matrix

| Capability                             | Status                             |
| -------------------------------------- | ---------------------------------- |
| Delayed equity quote                   | Supported                          |
| Daily, weekly, monthly OHLCV           | Supported                          |
| Delayed index snapshot                 | Supported when upstream returns it |
| Real-time data                         | Unsupported                        |
| Official instrument master or calendar | Unsupported                        |
| Index/sector membership history        | Unsupported                        |
| Point-in-time financials or revisions  | Unsupported                        |
| Corporate actions                      | Unsupported                        |
| Official benchmark constituents        | Unsupported                        |

`getPopularStocks()` is not used as an instrument universe. `THYAO`, `GARAN`,
`AKBNK`, `EREGL`, and `TUPRS` are development pilot references only.

## Selection and data flow

```dotenv
MARKET_DATA_PROVIDER=borsa-api
BORSA_API_ENABLED=true
BORSA_API_TIMEOUT_MS=10000
BORSA_API_MAX_CONCURRENCY=2
BORSA_API_REQUESTS_PER_SECOND=1
BORSA_API_ALLOW_IN_PRODUCTION=false
```

The existing market-data worker job remains the only ingestion path. It carries
provider, symbol, interval, range, and correlation ID. The existing registry,
validators, and immutable-revision PostgreSQL store perform normalization and
idempotent persistence. No scanner, watchlist, alert, portfolio, backtest, API,
or web module imports the vendor package.

Historical quote dates are bar/session dates, not exchange publication
timestamps. Since the package exposes no trustworthy exchange timestamp,
`sourceTimestamp` stays null. Atlas records reception as `receivedAt` and
`availableAt`, plus `SOURCE_TIMESTAMP_UNAVAILABLE`, `DELAYED`, and
`UNOFFICIAL_SOURCE`. Raw payloads are not persisted in public/domain tables.

Quotes cache for five minutes and OHLCV for six hours. Defaults are two
concurrent requests, one request per second, ten-second timeout, and three
bounded attempts. Only timeout, network, 429, and temporary upstream failures
retry; invalid symbols and payloads do not.

Live contracts are opt-in:

```sh
RUN_LIVE_BORSA_API_TESTS=true pnpm --filter @atlas/worker test:live:borsa-api
```

They assert structural invariants, never exact prices. A future licensed
Matriks, Finnet, Infront, or other provider replaces only the adapter and
composition-root selection; normalized consumers remain vendor-neutral.
