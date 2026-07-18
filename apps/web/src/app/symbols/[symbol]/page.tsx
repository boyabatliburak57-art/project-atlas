import { SymbolWorkspace } from '@/features/market/symbol-workspace';

export default async function SymbolPage({
  params,
}: {
  readonly params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <SymbolWorkspace symbol={symbol} />;
}
