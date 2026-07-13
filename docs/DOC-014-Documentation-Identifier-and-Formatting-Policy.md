# DOC-014 — Documentation Identifier and Formatting Policy

**Sürüm:** 1.0  
**Durum:** Onay için hazır

## ADR kimliği

Her ADR dosya adı, H1 başlığı ve `architecture/ADR_INDEX.md` kaydında aynı benzersiz kimliği kullanır.

## Çakışma politikası

- Kabul edilmiş ADR silinmez.
- Daha sonra oluşturulan veya resmi index dışında kalan belge sonraki boş kimliğe taşınır.
- Dosya adı, H1, index ve bütün çapraz referanslar atomik güncellenir.
- Kararın anlamı ve tarihi korunur.

## Markdown politikası

İnsan tarafından düzenlenen bütün Markdown dosyaları Prettier kapsamındadır:

- `README.md`
- `docs/**/*.md`
- `architecture/**/*.md`
- `database/**/*.md`
- `api/**/*.md`
- `tasks/**/*.md`
- `guides/**/*.md`
- `reports/**/*.md`
- `templates/**/*.md`

Generated olmayan Markdown dosyaları ignore edilemez.

## Zorunlu kapılar

```bash
pnpm validate:adr
pnpm format:check
```

Her iki komut da merge öncesinde başarılı olmalıdır.
