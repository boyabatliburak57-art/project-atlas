# Decision Proposal — Market Intelligence Policies

Bu belge henüz ADR değildir.

TASK-052 sırasında repository'deki sonraki boş ADR kimlikleri kullanılarak aşağıdaki kararlar ADR olarak kaydedilmelidir.

## Karar 1 — Market snapshot read model

Market overview ağır hesapları request sırasında değil versioned snapshot job'larıyla üretir.

## Karar 2 — Chart adjustment ve cutoff

Chart request adjustment mode'u zorunlu/explicit policy ile taşır. Quote, bar ve overlay cutoff farkı sessizce gizlenmez.

## Karar 3 — Fundamentals revision

Financial statement restatement overwrite edilmez; yeni provider revision olarak saklanır. Derived ratios formula version taşır.

## Karar 4 — Pattern candidate semantiği

Geometrik formasyonlar candidate olarak sunulur; confirmation yalnız sonraki kapalı bar kurallarıyla state transition yapar. Look-ahead yasaktır.
