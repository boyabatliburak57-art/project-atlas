# Production E-mail Domain Authentication Guide

## Sağlayıcı hesabı

- Production account
- Verified business identity
- API key
- Webhook signing secret
- Sandbox/production ayrımı

## DNS

- SPF
- DKIM
- DMARC
- Return-path/bounce domain
- Tracking domain, kullanılıyorsa

DMARC başlangıçta gözlem politikasıyla başlayabilir; nihai politika güvenli rollout ile sıkılaştırılır.

## Testler

- verification e-mail
- password reset
- security alert
- alert notification
- report-ready
- bounce
- complaint
- unsubscribe
- duplicate prevention
- webhook replay protection

## Güvenlik

- API key repository'ye yazılmaz
- Token subject/body loglarına yazılmaz
- Webhook signature doğrulanır
- Security e-mail'leri genel unsubscribe ile kapatılmaz
