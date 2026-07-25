'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { translate } from '../localization';
import { navigationApi, type SearchItem } from './api';

const links = [
  ['Market', '/market'],
  ['Scanner', '/scanner'],
  ['Watchlists', '/watchlists'],
  ['Alerts', '/alerts'],
  ['Portfolio', '/portfolios'],
  ['Strategies', '/strategies'],
  ['Backtests', '/backtests'],
  ['Experiments', '/experiments'],
  ['Reports', '/reports'],
  ['Trust', '/trust'],
  ['Activity', '/activity'],
  ['Settings', '/onboarding'],
] as const;
const actions = [
  ['Yeni tarama', '/scanner?new=true'],
  ['Yeni alarm', '/alerts?new=true'],
  ['Yeni işlem', '/portfolios?transaction=new'],
  ['Yeni strateji', '/strategies/new'],
] as const;

export function GlobalShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  useEffect(() => {
    if (open) {
      opened.current = true;
      input.current?.focus();
    } else {
      setQuery('');
      setResults([]);
      setStatus('');
      if (opened.current) {
        opened.current = false;
        trigger.current?.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setStatus('');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      navigationApi
        .search(query.trim())
        .then(({ items }) => {
          if (controller.signal.aborted) return;
          setResults(items);
          setActive(0);
          setStatus(translate('searchResults', { count: items.length }));
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setStatus(translate('searchUnavailable'));
        });
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const options = [
    ...actions
      .filter(([label]) =>
        label
          .toLocaleLowerCase('tr-TR')
          .includes(query.toLocaleLowerCase('tr-TR')),
      )
      .map(([title, href], index) => ({
        id: `action-${index}`,
        title,
        href,
        subtitle: translate('quickAction'),
      })),
    ...results,
  ];
  function choose(index: number) {
    const option = options[index];
    if (option === undefined) return;
    setOpen(false);
    router.push(option.href);
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        {translate('skipToContent')}
      </a>
      <header className="global-header">
        <Link className="global-brand" href="/market">
          Atlas
        </Link>
        <nav aria-label={translate('navigation')}>
          {links.map(([label, href]) => (
            <Link
              aria-current={pathname.startsWith(href) ? 'page' : undefined}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          ref={trigger}
          type="button"
        >
          {translate('search')} <kbd>⌘K</kbd>
        </button>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="global-disclosure">
        <p>
          Atlas yatırım tavsiyesi veya getiri garantisi vermez. Veri kesim
          zamanı ve yöntem sürümlerini sonuçla birlikte değerlendirin.
        </p>
        <Link href="/trust">Güven, metodoloji ve açıklamalar</Link>
        <span>Legal review required</span>
      </footer>
      {open ? (
        <div
          aria-label="Global arama ve komutlar"
          aria-modal="true"
          className="command-backdrop"
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const focusable = dialog.current?.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            if (focusable === undefined || focusable.length === 0) return;
            const first = focusable[0]!;
            const last = focusable[focusable.length - 1]!;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
          ref={dialog}
          role="dialog"
        >
          <section className="command-palette">
            <label htmlFor="global-search">Sayfa, sembol veya kayıt ara</label>
            <input
              aria-controls="global-search-results"
              aria-activedescendant={
                options[active] === undefined
                  ? undefined
                  : `global-option-${active}`
              }
              autoComplete="off"
              id="global-search"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive((value) => Math.min(value + 1, options.length - 1));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((value) => Math.max(0, value - 1));
                }
                if (event.key === 'Enter') choose(active);
              }}
              placeholder="Örn. THYAO veya emeklilik"
              ref={input}
              role="combobox"
              value={query}
            />
            <p aria-live="polite" className="sr-only">
              {status}
            </p>
            <ul id="global-search-results" role="listbox">
              {options.map((option, index) => (
                <li
                  aria-selected={active === index}
                  id={`global-option-${index}`}
                  key={`${option.id}-${option.href}`}
                  onMouseDown={() => choose(index)}
                  role="option"
                >
                  <strong>{option.title}</strong>
                  <span>{option.subtitle}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setOpen(false)} type="button">
              {translate('close')}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
