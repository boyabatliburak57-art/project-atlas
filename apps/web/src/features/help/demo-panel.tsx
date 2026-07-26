'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { demoApi } from './demo-api';

export function DemoPanel() {
  const client = useQueryClient();
  const query = useQuery({
    queryFn: demoApi.list,
    queryKey: ['demo-resources'],
    retry: false,
  });
  const create = useMutation({
    mutationFn: demoApi.create,
    onSuccess: (resources) =>
      client.setQueryData(['demo-resources'], resources),
  });
  const reset = useMutation({
    mutationFn: demoApi.reset,
    onSuccess: () => client.setQueryData(['demo-resources'], []),
  });
  const resources = query.data ?? [];

  return (
    <section aria-labelledby="demo-title" className="trust-section">
      <header>
        <p className="eyebrow">Güvenli ürün turu</p>
        <h2 id="demo-title">DEMO kaynakları</h2>
      </header>
      <p>
        Demo içerik yalnız hesabınıza aittir, gerçek kaynaklardan ayrı tutulur
        ve yatırım tavsiyesi veya getiri garantisi değildir.
      </p>
      <div className="trust-links">
        <button
          className="button primary"
          disabled={create.isPending}
          onClick={() => create.mutate()}
          type="button"
        >
          Demo kaynakları oluştur
        </button>
        <button
          disabled={reset.isPending || resources.length === 0}
          onClick={() => reset.mutate()}
          type="button"
        >
          Yalnız demo kaynaklarını sıfırla
        </button>
      </div>
      {query.isError && (
        <p role="alert">Demo kaynaklarına erişmek için oturum açın.</p>
      )}
      {(create.isError || reset.isError) && (
        <p role="alert">Demo işlemi tamamlanamadı.</p>
      )}
      {(create.isSuccess || reset.isSuccess) && (
        <p role="status">Demo kaynakları güncellendi.</p>
      )}
      <ul aria-label="Hesabıma ait demo kaynakları">
        {resources.map((resource) => (
          <li key={resource.id}>
            <strong>{resource.label}</strong>
            <span> · DEMO · {resource.resourceType}</span>
            <p>{resource.disclaimer}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
