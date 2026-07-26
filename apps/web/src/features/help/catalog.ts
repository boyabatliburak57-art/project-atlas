export interface HelpArticle {
  readonly category: string;
  readonly content: readonly string[];
  readonly keywords: readonly string[];
  readonly lastUpdated: string;
  readonly locale: 'tr-TR';
  readonly related: readonly string[];
  readonly slug: string;
  readonly summary: string;
  readonly title: string;
  readonly version: string;
}

const updated = '2026-07-26';
const version = 'help-v1';

export const helpArticles: readonly HelpArticle[] = [
  article(
    'baslangic',
    'Getting started',
    'Atlas ile başlangıç',
    'Onboarding, demo veri ve ilk araştırma akışını güvenli biçimde kurun.',
    [
      'Atlas araştırma ve karar desteği sunar; yatırım tavsiyesi veya getiri garantisi sunmaz.',
      'Piyasa, benchmark, bildirim ve erişilebilirlik tercihlerinizi onboarding ekranından belirleyin.',
      'DEMO etiketli örnekler yalnız hesabınıza aittir ve gerçek kaynaklardan ayrı sıfırlanır.',
    ],
    ['onboarding', 'demo', 'başlangıç'],
    ['scanner-baslangic', 'hesap-guvenlik'],
  ),
  article(
    'piyasa-semboller',
    'Market and symbols',
    'Piyasa ve sembol ekranları',
    'Fiyat, grafik, seans ve veri durumu alanlarını yorumlayın.',
    [
      'Sembol detayında kaynak zamanı, veri kesim zamanı ve adjustment politikası birlikte değerlendirilir.',
      'Eksik bar sıfır fiyat anlamına gelmez. Gecikmiş veya kısmi veri kullanıcıya ayrıca gösterilir.',
    ],
    ['market', 'symbol', 'ohlcv', 'grafik'],
    ['veri-tazeligi-metodoloji', 'glossary'],
  ),
  article(
    'scanner-baslangic',
    'Scanner',
    'Scanner ile tarama oluşturma',
    'Preset veya özel kurallarla yeniden üretilebilir taramalar çalıştırın.',
    [
      'İndikatör, operatör, timeframe ve parametreleri doğruladıktan sonra taramayı başlatın.',
      'Sonuç bulunmaması hata değildir; evren, veri kesimi ve kuralı birlikte kontrol edin.',
    ],
    ['scanner', 'saved scan', 'tarama', 'preset'],
    ['baslangic', 'veri-tazeligi-metodoloji'],
  ),
  article(
    'watchlist-alert',
    'Watchlists and alerts',
    'Watchlist ve alarm yönetimi',
    'Sembolleri izleyin; fiyat, indikatör veya tarama koşullarını bildirimlere bağlayın.',
    [
      'Watchlist piyasa özeti tazelik durumu taşır.',
      'Quiet hours ve kanal tercihleri delivery zamanını etkiler; güvenlik mesajları istisnadır.',
    ],
    ['watchlist', 'alert', 'bildirim'],
    ['piyasa-semboller', 'hesap-guvenlik'],
  ),
  article(
    'portfoy-risk',
    'Portfolio and risk',
    'Portföy, performans ve risk',
    'Pozisyon, TWR, XIRR, risk ve veri kalitesi sonuçlarını doğru bağlamda değerlendirin.',
    [
      'Maliyet, nakit akışı, corporate action ve fiyat politikası değerlemeyi etkiler.',
      'VaR ve volatilite geçmiş gözlemlere dayanır; gelecekteki kaybı tahmin veya garanti etmez.',
    ],
    ['portfolio', 'risk', 'twr', 'xirr', 'var'],
    ['glossary', 'veri-tazeligi-metodoloji'],
  ),
  article(
    'fundamentals-patterns',
    'Fundamentals and patterns',
    'Finansallar ve formasyon adayları',
    'Revision, available-at ve formasyon kanıt noktalarını inceleyin.',
    [
      'Restatement yeni bir revision oluşturur; eksik metric sıfır kabul edilmez.',
      'Pattern candidate algoritmik bir adaydır; gelecek fiyat tahmini değildir.',
    ],
    ['fundamentals', 'patterns', 'revision', 'formasyon'],
    ['veri-tazeligi-metodoloji', 'glossary'],
  ),
  article(
    'strategy-lab',
    'Strategy Lab and backtesting',
    'Strategy Lab ve backtest',
    'Strateji doğrulama, maliyet varsayımları ve bias risklerini görün.',
    [
      'Backtest sonuçları kullanılan data snapshot, motor ve metodoloji sürümüne bağlıdır.',
      'Slippage, komisyon, survivorship bias ve look-ahead bias sonuçları önemli ölçüde değiştirebilir.',
    ],
    ['strategy', 'backtest', 'experiment', 'slippage', 'bias'],
    ['glossary', 'raporlar-export'],
  ),
  article(
    'raporlar-export',
    'Reports and exports',
    'Raporlar ve dışa aktarma',
    'Rapor üretimi, veri kesimi, expiry ve güvenli download akışını anlayın.',
    [
      'Her rapor generatedAt, dataCutoffAt, metodoloji, kaynak revision ve uyarı taşır.',
      'Export ekranda bulunmayan bir doğruluk veya tamlık garantisi oluşturmaz.',
    ],
    ['reports', 'exports', 'download', 'csv'],
    ['veri-tazeligi-metodoloji', 'hesap-guvenlik'],
  ),
  article(
    'veri-tazeligi-metodoloji',
    'Data freshness and methodology',
    'Veri tazeliği ve metodoloji',
    'Source timestamp, available-at, cutoff, stale ve partial durumlarını ayırın.',
    [
      'Source timestamp sağlayıcının olayı zamanladığı anı, available-at Atlas’ın veriyi güvenle kullanabildiği anı gösterir.',
      'Data cutoff hesaplamaya giren en son veriyi sınırlar. Stale ve partial durumları sonuçla birlikte görünür kalır.',
    ],
    ['freshness', 'methodology', 'cutoff', 'stale', 'partial'],
    ['glossary', 'piyasa-semboller'],
  ),
  article(
    'hesap-guvenlik',
    'Account and security',
    'Hesap, oturum ve veri hakları',
    'Oturum, bildirim, consent, export ve hesap silme akışlarına erişin.',
    [
      'Şüpheli oturumlarda parolanızı değiştirin ve aktif oturumları sonlandırın.',
      'Hukuki belge sürümleri ve onay geçmişi hesap ayarlarından görülebilir.',
    ],
    ['account', 'security', 'session', 'deletion', 'consent'],
    ['sorun-giderme', 'raporlar-export'],
  ),
  article(
    'sorun-giderme',
    'Troubleshooting',
    'Sorun giderme',
    'Gecikmiş veri, tamamlanmayan job ve erişim hatalarında güvenli adımları izleyin.',
    [
      'Önce veri tazeliği uyarısını, job durumunu ve correlation ID’yi kaydedin.',
      'Tekrarlı create çağrısı yerine mevcut run durumunu kontrol edin; destek talebinde secret paylaşmayın.',
    ],
    ['troubleshooting', 'error', 'queue', 'support'],
    ['faq', 'hesap-guvenlik'],
  ),
  article(
    'faq',
    'FAQ',
    'Sık sorulan sorular',
    'Atlas çıktıları, demo içerik ve veri kapsamı hakkında kısa yanıtlar.',
    [
      'Atlas yatırım tavsiyesi verir mi? Hayır; araştırma ve karar desteği sağlar.',
      'DEMO sonuçlar gerçek mi? Hayır; deterministic, örnek ve açıkça etiketlenmiş içeriktir.',
      'Eksik değer sıfır mıdır? Hayır; eksik ve hesaplanamayan değerler ayrı durum taşır.',
    ],
    ['faq', 'yatırım tavsiyesi', 'demo'],
    ['baslangic', 'glossary'],
  ),
  article(
    'glossary',
    'Glossary',
    'Finans ve veri sözlüğü',
    'Ürün genelinde kullanılan temel veri, performans ve risk terimleri.',
    [
      'OHLCV: Açılış, en yüksek, en düşük, kapanış ve hacim barı.',
      'Adjusted/raw price: Corporate action etkileri düzeltilmiş fiyat ve sağlayıcının ham fiyatı.',
      'Data cutoff: Hesaplamaya dahil edilen en son veri zamanı.',
      'Stale/partial: Beklenen tazelik dışında veya kapsamı eksik veri.',
      'TWR: Nakit akışlarının etkisini ayıran zaman ağırlıklı getiri.',
      'XIRR: Düzensiz tarihli nakit akışları için yıllıklandırılmış iç verim oranı.',
      'Volatility: Getiri değişkenliğinin istatistiksel ölçüsü.',
      'Beta: Varlık getirisinin benchmark hareketine duyarlılığı.',
      'VaR: Belirli varsayımlarla tahmini kayıp eşiği; garanti değildir.',
      'Sharpe/Sortino/Calmar: Getiriyi toplam risk, aşağı yönlü risk veya drawdown ile karşılaştıran oranlar.',
      'Drawdown: Bir zirveden sonraki düşüş.',
      'Turnover: Portföydeki işlem/değişim yoğunluğu.',
      'Slippage: Varsayılan fiyat ile gerçekleşebilir fiyat arasındaki fark.',
      'Survivorship bias: Yalnız hayatta kalan varlıkların örneklemde tutulması yanlılığı.',
      'Look-ahead bias: O tarihte bilinmeyen gelecekteki bilginin yanlışlıkla kullanılması.',
      'Pattern candidate: Kanıt noktaları taşıyan algoritmik formasyon adayı; tahmin değildir.',
    ],
    [
      'ohlcv',
      'twr',
      'xirr',
      'volatility',
      'beta',
      'var',
      'sharpe',
      'sortino',
      'calmar',
      'drawdown',
      'turnover',
      'slippage',
      'survivorship',
      'look-ahead',
    ],
    ['veri-tazeligi-metodoloji', 'strategy-lab'],
  ),
];

export const helpCategories = [
  ...new Set(helpArticles.map(({ category }) => category)),
];

export function findHelpArticle(slug: string): HelpArticle | undefined {
  return helpArticles.find((article) => article.slug === slug);
}

export function searchHelp(query: string): readonly HelpArticle[] {
  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  if (normalized.length < 2) return [];
  const terms = normalized.split(/\s+/u);
  return helpArticles
    .map((article) => ({
      article,
      score: terms.reduce(
        (score, term) =>
          score +
          matchScore(article.title, term, 8) +
          matchScore(article.category, term, 6) +
          matchScore(article.summary, term, 4) +
          article.keywords.reduce(
            (total, value) => total + matchScore(value, term, 5),
            0,
          ) +
          article.content.reduce(
            (total, value) => total + matchScore(value, term, 1),
            0,
          ),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.article.title.localeCompare(b.article.title, 'tr'),
    )
    .map(({ article }) => article);
}

function matchScore(value: string, query: string, weight: number): number {
  return value.toLocaleLowerCase('tr-TR').includes(query) ? weight : 0;
}

function article(
  slug: string,
  category: string,
  title: string,
  summary: string,
  content: readonly string[],
  keywords: readonly string[],
  related: readonly string[],
): HelpArticle {
  return {
    category,
    content,
    keywords,
    lastUpdated: updated,
    locale: 'tr-TR',
    related,
    slug,
    summary,
    title,
    version,
  };
}
