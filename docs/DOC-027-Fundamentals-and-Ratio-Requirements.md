# DOC-027 — Fundamentals and Ratio Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

BIST şirketleri için provider'dan gelen finansal tablo snapshot'larını normalize etmek, dönemleri karşılaştırmak ve açıklanabilir finansal oranlar üretmek.

## 2. Veri kaynağı sınırı

- Lisanslı veya açıkça izin verilen provider adapter kullanılır.
- Scraping bu sürümün varsayılan yöntemi değildir.
- Provider ham alanları domain modeline doğrudan sızmaz.
- Her snapshot provider, source timestamp ve revision taşır.

## 3. Dönemler

- yıllık
- ara dönem/çeyreklik
- trailing twelve months, yeterli dönem varsa türetilmiş

Dönem karşılaştırmasında mali yıl ve dönem türü açıkça saklanır.

## 4. Normalize finansal alanlar

İlk set:

- revenue
- gross profit
- operating profit
- EBITDA, veri/policy destekliyorsa
- net income
- total assets
- total liabilities
- equity
- cash and equivalents
- financial debt
- operating cash flow
- capital expenditure
- free cash flow, türetilmiş
- shares outstanding

Alan bulunmadığında sıfır kabul edilmez.

## 5. Oranlar

- P/E
- P/B
- EV/EBITDA, veri yeterliyse
- net debt/EBITDA
- gross margin
- operating margin
- net margin
- ROA
- ROE
- current ratio
- debt/equity
- free cash flow margin
- revenue growth
- net income growth

## 6. Hesaplama ilkeleri

- Ratio formula versioned olmalıdır.
- Denominator zero/negative politikası oran bazında açık olmalıdır.
- Market price ve financial period cutoff karıştırılmaz.
- Piyasa bazlı oranlar `marketDataCutoffAt` taşır.
- Dönemler arası currency/unit normalization yapılır.
- Restatement yeni revision üretir.

## 7. Quality status

Her metric:

- value
- status
- reasonCode
- formulaVersion
- period
- source/revision
- warnings

taşıyabilir.

## 8. UI sunumu

- dönem tablosu
- yıllık/çeyreklik trend
- oran kartları
- sektör medyanı karşılaştırması, yeterli veri varsa
- veri dönemi ve yayın zamanı
- restated işareti

## 9. Kabul kriterleri

- Missing alan sıfır değil.
- Denominator edge cases testli.
- Restatement revision testli.
- TTM yalnız yeterli dönemle oluşur.
- Market cutoff ve financial period ayrı gösterilir.
- Public çıktıda NaN/Infinity yoktur.
