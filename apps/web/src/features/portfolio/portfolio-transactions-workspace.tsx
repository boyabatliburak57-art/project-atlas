'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import {
  errorMessage,
  formatDateTime,
  formatDecimal,
  formatMoney,
  idempotencyKey,
  PortfolioSubnav,
} from './portfolio-ui';
import type { PortfolioTransactionType } from './types';

const transactionLabels: Readonly<Record<PortfolioTransactionType, string>> = {
  buy: 'Alış',
  sell: 'Satış',
  cashDeposit: 'Nakit yatırma',
  cashWithdrawal: 'Nakit çekme',
  dividend: 'Temettü',
  fee: 'Ücret',
  tax: 'Vergi',
  adjustment: 'Düzeltme',
};

export function PortfolioTransactionsWorkspace({
  portfolioId,
}: {
  readonly portfolioId: string;
}) {
  const client = useQueryClient();
  const portfolio = useQuery({
    queryKey: ['portfolios', portfolioId],
    queryFn: () => portfolioApi.portfolio(portfolioId),
    retry: false,
  });
  const transactions = useQuery({
    queryKey: ['portfolios', portfolioId, 'transactions'],
    queryFn: () => portfolioApi.transactions(portfolioId),
    retry: false,
  });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof portfolioApi.createTransaction>[2]) =>
      portfolioApi.createTransaction(
        portfolioId,
        idempotencyKey('draft'),
        input,
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ['portfolios', portfolioId, 'transactions'],
      }),
  });
  const post = useMutation({
    mutationFn: (transactionId: string) =>
      portfolioApi.postTransaction(
        portfolioId,
        transactionId,
        idempotencyKey('post'),
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['portfolios', portfolioId] });
    },
  });
  const reverse = useMutation({
    mutationFn: (transactionId: string) =>
      portfolioApi.reverseTransaction(
        portfolioId,
        transactionId,
        idempotencyKey('reverse'),
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['portfolios', portfolioId] });
    },
  });
  const actionError = create.error ?? post.error ?? reverse.error;

  return (
    <AtlasShell>
      <main className="portfolio-main transaction-main">
        <header className="portfolio-page-header compact-heading">
          <div>
            <p className="rail-label">Immutable ledger</p>
            <h1>{portfolio.data?.name ?? 'İşlemler'}</h1>
            <p>
              Posted işlemler düzenlenmez. Hatalı kayıtlar reversal ve yeni
              işlem ile düzeltilir.
            </p>
          </div>
        </header>
        <PortfolioSubnav portfolioId={portfolioId} />
        {portfolio.isError && (
          <WorkspaceState kind="error">
            {errorMessage(portfolio.error)}
          </WorkspaceState>
        )}
        <TransactionComposer
          disabled={create.isPending || portfolio.data?.status === 'deleted'}
          onSubmit={(input) => create.mutate(input)}
        />
        {actionError && (
          <p className="form-error transaction-error" role="alert">
            {errorMessage(actionError)}
          </p>
        )}
        <section
          aria-labelledby="transaction-history-title"
          className="transaction-history"
        >
          <div className="section-heading-inline">
            <div>
              <h2 id="transaction-history-title">İşlem geçmişi</h2>
              <p>
                Taslaklar post edilebilir. Posted satırlar yalnız reversal kabul
                eder.
              </p>
            </div>
          </div>
          {transactions.isLoading && (
            <WorkspaceState kind="loading">İşlemler yükleniyor.</WorkspaceState>
          )}
          {transactions.isError && (
            <WorkspaceState kind="error">
              {errorMessage(transactions.error)}
            </WorkspaceState>
          )}
          {transactions.data?.length === 0 && (
            <WorkspaceState kind="empty">
              Henüz işlem bulunmuyor.
            </WorkspaceState>
          )}
          {transactions.data && transactions.data.length > 0 && (
            <div className="market-table-wrap">
              <table className="market-table transaction-table">
                <thead>
                  <tr>
                    <th>İşlem</th>
                    <th>Tarih</th>
                    <th>Miktar</th>
                    <th>Birim fiyat</th>
                    <th>Nakit</th>
                    <th>Ücret ve vergi</th>
                    <th>Durum</th>
                    <th>Eylem</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.data.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <strong>{transactionLabels[transaction.type]}</strong>
                        <small>
                          {transaction.note ??
                            transaction.instrumentId ??
                            'Nakit işlemi'}
                        </small>
                      </td>
                      <td>{formatDateTime(transaction.tradeAt)}</td>
                      <td>{formatDecimal(transaction.quantity)}</td>
                      <td>{formatMoney(transaction.unitPrice)}</td>
                      <td>{formatMoney(transaction.cashAmount)}</td>
                      <td>
                        {formatMoney(
                          String(
                            Number(transaction.fee) + Number(transaction.tax),
                          ),
                        )}
                      </td>
                      <td>
                        <TransactionStatus status={transaction.status} />
                      </td>
                      <td>
                        {transaction.status === 'draft' && (
                          <button
                            className="text-button"
                            type="button"
                            disabled={post.isPending}
                            onClick={() => post.mutate(transaction.id)}
                          >
                            Post et
                          </button>
                        )}
                        {transaction.status === 'posted' && (
                          <div className="immutable-action">
                            <span>Düzenlenemez</span>
                            <button
                              className="text-button"
                              type="button"
                              disabled={reverse.isPending}
                              onClick={() => reverse.mutate(transaction.id)}
                            >
                              Ters kayıt oluştur
                            </button>
                          </div>
                        )}
                        {transaction.status === 'reversed' && (
                          <span>Reversal tamamlandı</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AtlasShell>
  );
}

function TransactionComposer({
  disabled,
  onSubmit,
}: {
  readonly disabled: boolean;
  readonly onSubmit: (
    input: Parameters<typeof portfolioApi.createTransaction>[2],
  ) => void;
}) {
  const [type, setType] = useState<PortfolioTransactionType>('cashDeposit');
  const instrumentRequired = ['buy', 'sell', 'dividend'].includes(type);
  const quantityRequired = ['buy', 'sell'].includes(type);
  const priceRequired = ['buy', 'sell'].includes(type);
  const cashRequired = [
    'cashDeposit',
    'cashWithdrawal',
    'dividend',
    'fee',
    'tax',
    'adjustment',
  ].includes(type);
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 16), []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => {
      const raw = data.get(name);
      return typeof raw === 'string' ? raw.trim() : '';
    };
    onSubmit({
      type,
      tradeAt: new Date(value('tradeAt')).toISOString(),
      instrumentId: instrumentRequired ? value('instrumentId') || null : null,
      quantity: quantityRequired ? value('quantity') || null : null,
      unitPrice: priceRequired ? value('unitPrice') || null : null,
      fee: value('fee') || '0',
      tax: value('tax') || '0',
      cashAmount: cashRequired ? value('cashAmount') || null : null,
      externalReference: value('externalReference') || null,
      adjustmentReason:
        type === 'adjustment' ? value('adjustmentReason') || null : null,
      note: value('note') || null,
    });
  }
  return (
    <form className="transaction-composer" onSubmit={submit}>
      <div className="section-heading-inline">
        <div>
          <h2>Yeni işlem</h2>
          <p>
            Decimal değerler API’ye nokta ayırıcılı string olarak gönderilir.
          </p>
        </div>
        <button className="button primary" disabled={disabled}>
          {disabled ? 'Kaydediliyor' : 'Taslak oluştur'}
        </button>
      </div>
      <div className="transaction-form-grid">
        <label>
          <span>İşlem türü</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as PortfolioTransactionType)
            }
          >
            {Object.entries(transactionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>İşlem zamanı</span>
          <input
            name="tradeAt"
            type="datetime-local"
            defaultValue={defaultDate}
            required
          />
        </label>
        <label>
          <span>Enstrüman kimliği</span>
          <input
            name="instrumentId"
            required={instrumentRequired}
            pattern="[0-9a-fA-F-]{36}"
            placeholder={instrumentRequired ? 'Zorunlu UUID' : 'İsteğe bağlı'}
          />
        </label>
        <label>
          <span>Miktar</span>
          <input
            name="quantity"
            inputMode="decimal"
            required={quantityRequired}
            pattern="[0-9]+([.][0-9]+)?"
            placeholder="0.0000"
          />
        </label>
        <label>
          <span>Birim fiyat</span>
          <input
            name="unitPrice"
            inputMode="decimal"
            required={priceRequired}
            pattern="[0-9]+([.][0-9]+)?"
            placeholder="0.00"
          />
        </label>
        <label>
          <span>Nakit tutarı</span>
          <input
            name="cashAmount"
            inputMode="decimal"
            required={cashRequired}
            pattern="[0-9]+([.][0-9]+)?"
            placeholder="0.00"
          />
        </label>
        <label>
          <span>Komisyon</span>
          <input
            name="fee"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]+)?"
            defaultValue="0"
          />
        </label>
        <label>
          <span>Vergi</span>
          <input
            name="tax"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]+)?"
            defaultValue="0"
          />
        </label>
        <label>
          <span>Harici referans</span>
          <input name="externalReference" maxLength={500} />
        </label>
        <label>
          <span>Düzeltme gerekçesi</span>
          <input
            name="adjustmentReason"
            required={type === 'adjustment'}
            maxLength={1000}
          />
        </label>
        <label className="transaction-note-field">
          <span>Not</span>
          <input name="note" maxLength={4000} />
        </label>
      </div>
    </form>
  );
}

function TransactionStatus({
  status,
}: {
  readonly status: 'draft' | 'posted' | 'reversed' | 'deleted';
}) {
  const label = {
    draft: 'Taslak',
    posted: 'Posted',
    reversed: 'Ters kayıt',
    deleted: 'Silindi',
  }[status];
  return (
    <span
      className={`status-chip ${status === 'posted' ? 'active' : 'paused'}`}
    >
      {label}
    </span>
  );
}
