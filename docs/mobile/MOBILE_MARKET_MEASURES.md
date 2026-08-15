# Mobile Market Measures

## List and filters

The list is cursor-paginated in pages of 20. Search is restricted to symbol/company presentation data. Quick relevance filters are `Tümü`, `Takip Ettiklerim`, and `Portföyüm`; detailed type filtering uses canonical TASK-110F1 values. Sorting and status resolution remain server-authoritative.

| Canonical value              | Customer label                      |
| ---------------------------- | ----------------------------------- |
| `SHORT_SELL_RESTRICTION`     | Açığa Satış / Kredili İşlem Tedbiri |
| `MARGIN_TRADING_RESTRICTION` | Kredili İşlem Tedbiri               |
| `GROSS_SETTLEMENT`           | Brüt Takas                          |
| `SINGLE_PRICE`               | Tek Fiyat                           |
| `ORDER_PACKAGE_MEASURE`      | Emir Paketi Tedbiri                 |
| `OTHER_EXCHANGE_MEASURE`     | Diğer Tedbir                        |

The mapping adds no legal meaning beyond canonical data. Missing end dates display “Belirtilmedi”; missing numeric data displays an em dash, never zero.

## Revision and accessibility

The standard list displays the current valid revision. Corrected records are marked; previous versions remain reachable through bounded history and are not shown as simultaneous measures.

Every row exposes symbol, measure type, textual state, start, and end semantics in one accessibility label. Tabs expose selected state, controls use shared minimum touch targets, and dates do not rely on color.
