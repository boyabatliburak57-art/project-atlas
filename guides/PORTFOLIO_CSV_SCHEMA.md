# Portfolio CSV Schema

UTF-8 ve header zorunludur.

Kolonlar:

- portfolio
- transactionType
- symbol
- tradeDate
- quantity
- unitPrice
- fee
- tax
- cashAmount
- externalReference
- note

Formula injection koruması `=`, `+`, `-` veya `@` ile başlayan export hücrelerinde uygulanır.

Varsayılan commit atomic'tir. Partial import yalnız açık kullanıcı seçimiyle çalışır.
