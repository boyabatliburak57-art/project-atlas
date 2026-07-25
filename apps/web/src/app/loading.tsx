export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="route-loading">
      <span aria-hidden="true" className="route-loading-mark" />
      <div>
        <strong>Atlas görünümü hazırlanıyor</strong>
        <p>Veri ve metodoloji bağlamı yükleniyor.</p>
      </div>
    </main>
  );
}
