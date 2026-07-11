# GitHub Kurulum Rehberi

## GitHub web arayüzü

1. GitHub'da `project-atlas` adında private repository oluştur.
2. İndirdiğin ZIP'i bilgisayarında aç.
3. Repository içinde `Add file` → `Upload files` seç.
4. ZIP'in kendisini değil, açılan klasörün içeriğini yükle.
5. Commit mesajı yaz:

```text
docs: add Atlas foundation documentation
```

6. `Commit changes` seç.

## Terminal yöntemi

```bash
cd ~/Documents
git clone https://github.com/KULLANICI_ADI/project-atlas.git
cd project-atlas
cp -R ~/Downloads/project-atlas-foundation-v0.1/. .
git status
git add .
git commit -m "docs: add Atlas foundation documentation"
git push origin main
```

## Önerilen branch kullanımı

İlk kod görevinden itibaren:

```bash
git checkout -b chore/repository-foundation
```

Değişiklikleri bu branch'te yap, ardından GitHub üzerinden pull request aç.
