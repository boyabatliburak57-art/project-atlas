import Link from 'next/link';

const states = [
  ['Tam', 'Gerekli veri kapsamı değerlendirilmiştir.'],
  ['Kısmi', 'Bazı kayıtlar eksiktir; hariç tutulan kapsam ayrıca gösterilir.'],
  ['Gecikmiş', 'Veri beklenen tazelik penceresinin dışındadır.'],
  [
    'Hesaplanamadı',
    'Girdi veya gözlem sayısı güvenilir hesap için yetersizdir.',
  ],
] as const;

export function TrustWorkspace() {
  return (
    <main className="trust-center">
      <header className="trust-heading">
        <p className="eyebrow">Güven ve yöntem merkezi</p>
        <h1>Sonuçların ne söylediğini ve ne söylemediğini görün.</h1>
        <p>
          Atlas araştırma ve karar desteği sağlar. Çıktılar yatırım tavsiyesi,
          getiri garantisi, gerçek emir sonucu veya resmî değerleme değildir.
        </p>
      </header>
      <aside className="legal-review-note" aria-labelledby="legal-review-title">
        <strong id="legal-review-title">Legal review required</strong>
        <p>
          Bu ürün içi açıklamalar hukuki uygunluk beyanı değildir. Kullanım
          koşulları, veri lisansları ve düzenleyici metinler yetkili hukuk
          incelemesinden geçmelidir.
        </p>
      </aside>
      <section aria-labelledby="states-title" className="trust-section">
        <header>
          <p className="eyebrow">Veri durumu</p>
          <h2 id="states-title">Tazelik ve hesaplanabilirlik</h2>
        </header>
        <dl className="trust-state-list">
          {states.map(([label, description]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
        <p>
          Her sonuç mümkün olduğunda veri kesim zamanı, kaynak zamanı ve sürüm
          bilgisi taşır. Eksik veri sıfır kabul edilmez.
        </p>
      </section>
      <section aria-labelledby="methods-title" className="trust-section">
        <header>
          <p className="eyebrow">Metodoloji</p>
          <h2 id="methods-title">Sürümlü ve yeniden üretilebilir hesaplar</h2>
        </header>
        <div className="trust-method-grid">
          <article>
            <h3>İndikatörler ve formasyonlar</h3>
            <p>
              İndikatör adı, parametreleri ve sürümü görünürdür. Formasyonlar
              kanıt noktaları taşıyan algoritmik adaylardır; “onaylandı” durumu
              gelecek fiyat tahmini değildir.
            </p>
          </article>
          <article>
            <h3>Değerleme ve risk</h3>
            <p>
              Fiyat politikası, benchmark, gözlem sayısı, kesim zamanı ve
              metodoloji sürümü birlikte gösterilir. Historical VaR ve geçmiş
              oynaklık gelecekteki kaybı tahmin veya garanti etmez.
            </p>
          </article>
          <article>
            <h3>Backtest ve deneyler</h3>
            <p>
              Kapalı bar sinyali sonraki uygun bar açılışında uygulanır. İşlem
              maliyeti, komisyon, slippage, bütün-hisse yuvarlama ve
              point-in-time veri politikaları sonucu etkiler. Look-ahead,
              survivorship ve selection bias riski tamamen ortadan kaldırılamaz.
            </p>
          </article>
          <article>
            <h3>Raporlar</h3>
            <p>
              Raporlar üretim/kesim zamanı, metodoloji ve kaynak revizyonları,
              uyarılar, durum ve süre sonu taşır. Export, ekranda görünmeyen bir
              doğruluk veya tamlık garantisi vermez.
            </p>
          </article>
        </div>
      </section>
      <section aria-labelledby="sources-title" className="trust-section">
        <header>
          <p className="eyebrow">Kaynaklar</p>
          <h2 id="sources-title">Güvenli atıf metadata’sı</h2>
        </header>
        <p>
          Sağlayıcının paylaşılabilir etiketi, veri zamanı, revizyon ve
          metodoloji sürümü gösterilebilir. Kimlik bilgileri, bağlantı
          dizgileri, dahili endpoint/topoloji, ham sağlayıcı payload’u ve stack
          trace hiçbir açıklama yüzeyine dahil edilmez.
        </p>
      </section>
      <nav aria-label="Metodoloji yüzeyleri" className="trust-links">
        <Link href="/market">Piyasa tazeliğini incele</Link>
        <Link href="/portfolios">Portföy metodolojisini incele</Link>
        <Link href="/backtests">Backtest açıklamalarını incele</Link>
        <Link href="/reports">Rapor metodolojisini incele</Link>
      </nav>
    </main>
  );
}
