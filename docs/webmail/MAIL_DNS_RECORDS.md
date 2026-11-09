# The mail DNS to publish — and the API deploy it unlocks

_The prepared, not-yet-run work. Every record here comes from Stalwart's own
`dnsZoneFile` (the authoritative source), with the target host changed from
Stalwart's placeholder to FIDScript's public mail host. Publishing and the API
rebuild are both waited on the operator's sign-off, because each touches a
running service or the live DNS._

---

## 1. The target host, and what is in the zone today

The records point at Stalwart's SMTP. Today's live state:

- `mail.fidscript.com` already resolves, to the VPS's public IP
  (`72.61.89.110`). **This is the MX target.**
- `fidscript.com`'s MX/SPF still point at the registrar's `eForward` parking
  (five MX records to `eforward*.registrar-servers.com`). That is the
  apex's own zone; it is the one place the mail records have not reached.

So the work splits by zone:

| Name                    | Where it lives                              | The records to publish                                    |
| ----------------------- | ------------------------------------------- | --------------------------------------------------------- |
| `demo.fidscript.com`     | the project's Cloudflare zone (a record exists) | the full set below, written through the project's own connection |
| `fidscript.com` (the apex) | the registrar's zone (eForward parking)     | the MX and the SPF, moved to `mail.fidscript.com`        |

`demo.fidscript.com` is the name the webmail platform's own project owns
(the one-domain-per-project rule): its mailboxes are
`name@demo.fidscript.com`. The apex `fidscript.com` is the platform's own
domain; its mail records are the last two that still sit at the registrar.

---

## 2. The record set, from Stalwart's own zone file

Read on 2026-11-09, as the domain `fidscript.com`, the two DKIM selectors
Stalwart is running now (both dated `20261106`, the fresh pair; Stalwart
rotates them on its own schedule, so the set to publish is what Stalwart's
zone file says at the moment of publishing, not a copy kept here):

```
; the DKIM keys (the pair Stalwart signs with now)
v1-ed25519-20261106._domainkey.<domain>.  TXT  "v=DKIM1; k=ed25519; h=sha256; p=tV0aRnPuRwOg6GcjkE5zkA0bQHGVlgkO490vGH1DpcE="
v1-rsa-20261106._domainkey.<domain>.       TXT  "v=DKIM1; k=rsa; h=sha256; p=MIIBIjANBgkqhkiG9w0BAQ…"  (the full key, from Stalwart at publish time)

; sender policy — Stalwart's mail and nothing else
<domain>.                                    TXT  "v=spf1 mx -all"

; DMARC — rejects unauthenticated, reports to the postmaster
_dmarc.<domain>.                             TXT  "v=DMARC1; p=reject; rua=mailto:postmaster@<domain>"

; the service discovery records (the clients find Stalwart through them)
_imaps._tcp.<domain>.                        SRV  0 1 993 mail.<domain>
_pop3s._tcp.<domain>.                         SRV  0 1 995 mail.<domain>
_submissions._tcp.<domain>.                   SRV  0 1 465 mail.<domain>
_jmap._tcp.<domain>.                          SRV  0 1 443 mail.<domain>
_carddavs._tcp.<domain>.                      SRV  0 1 443 mail.<domain>
_caldavs._tcp.<domain>.                      SRV  0 1 443 mail.<domain>

; transport security
_mta-sts.<domain>.                            TXT  "v=STSv1; id=138449342089700316"
mta-sts.<domain>.                             CNAME mail.<domain>
_smtp._tls.<domain>.                          TXT  "v=TLSRPTv1; rua=mailto:postmaster@<domain>"

; the client auto-config (the mail app finds the accounts without being told)
autodiscover.<domain>.                        CNAME mail.<domain>
autoconfig.<domain>.                          CNAME mail.<domain>
ua-auto-config.<domain>.                      CNAME mail.<domain>
_ua-auto-config.<domain>.                     TXT  "v=UAAC1; a=sha256; d=GibZGt63UmC8j6M2bJFgJUfFcFTFJe1oTdoujl/6t9c="

; the one record that actually routes inbound mail
<domain>.                                     MX 10 mail.<domain>
```

Where `<domain>` is `demo.fidscript.com` for the project's zone, and
`fidscript.com` for the apex's; `mail.<domain>` is the A record that already
answers with the public IP.

**The MTA-STS and the TLS-RPT are the two that keep the reputation honest.**
They are what a receiver reads to know the mail's TLS policy and where the
reports land; without them the platform is signing and sending with no
transport-security statement at all.

---

## 3. The publish, and how it is checked

The records are written through the project's own Cloudflare connection — the
same path the platform's one-click set-up uses — so nothing is hand-typed
into a registrar's console. After the write, the check is the platform's own:
the webmail's **mail health** re-runs its lookups (the MX, the SPF, the
DMARC, each DKIM selector by name, the MTA-STS and the TLS-RPT) and says
which are confirmed. A record that is written but not yet resolvable reads as
"written, not confirmed yet" — it does not read as done.

The apex `fidscript.com`'s MX and SPF are the one place the operator's hand
is needed: the zone is at the registrar, not in Cloudflare, so those two
records move to `mail.fidscript.com` there. That is the only part that is
not a one-click.

---

## 4. The API deploy the fix waits on

The two fixes are committed in this repository (`62c1e80`), but the running
API was built from the installer's own checkout, so the fix is not in the
live platform yet. The deploy, when it is signed off:

```
# 1. Sync the two fixed files into the installer's checkout (the API builds
#    from there, not from this repository)
cp apps/api/src/modules/email/services/email-bootstrap.service.ts \
   apps/api/src/modules/email/services/domain.service.ts \
   /opt/fidscript-deploy/apps/api/src/modules/email/services/

# 2. Rebuild and restart the api (and only the api)
sudo docker compose -f /opt/fidscript-deploy/installer/docker/docker-compose.yml \
   build api && sudo docker compose -f /opt/fidscript-deploy/installer/docker/docker-compose.yml \
   up -d api

# 3. The check: the bootstrap's log says the platform domain is registered
#    under the platform's own project (no longer a skipped foreign key), and
#    the set-up's answer reports the records' own truth instead of calling
#    itself verified on faith.
```

Both fixes are small and in one place (the email module's two services); the
restart touches the api container alone. Nothing else is rebuilt.

---

## 5. What the sign-off decides

Two independent decisions, each of which is the operator's:

1. **Publish the records** — the `demo.fidscript.com` set through the
   project's Cloudflare connection, and the apex's two records at the
   registrar. Live DNS, the platform's own mail path.
2. **Deploy the API fix** — the rebuild and the restart, as above. A running
   service, one container at a time.

Neither has been run. What is ready for each is this file and the commit
that carries the code.
