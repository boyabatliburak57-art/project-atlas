# Backtest Data Integrity Guide

## Run kanıtı

- data snapshot hash
- cutoff
- market/universe revisions
- fundamental availability policy
- corporate action revision
- engine/policy versions

## Look-ahead fixture

Future barın signal sonucunu etkilemediği doğrulanır.

## Survivorship fixture

- geçmişte delisted
- sonradan listed
- index giriş/çıkış
- historical universe query

## Fundamentals fixture

- period end
- original publication
- later restatement
- signal before/after publication

## Same-bar leakage

Signal close ile hesaplanırsa default fill next open'dır.

## Adjustment double count

Adjusted price ile split position adjustment aynı anda uygulanmaz.

## Delisting

Cash settlement, last trade, write-off veya unavailable policy açık ve versioned olmalıdır.

## Reproducibility

Aynı snapshot ile summary hash, fill sequence, trade count ve equity hash eşleşir.
