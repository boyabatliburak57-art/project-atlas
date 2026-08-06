import { ScrollScreen, AppHeader, Badge, State } from '@atlas/mobile-ui';
export default function LegalRoute() {
  return (
    <ScrollScreen>
      <AppHeader
        title="Yasal belgeler"
        subtitle="Sürümlü consent entegrasyonu"
      />
      <Badge label="LEGAL_REVIEW_REQUIRED · NOT_FOR_PRODUCTION_PUBLICATION" />
      <State
        title="Yayınlanmış belge gerekli"
        detail="Yalnız backend tarafından published olarak sunulan sürümlü belgeler kabul edilebilir."
      />
    </ScrollScreen>
  );
}
