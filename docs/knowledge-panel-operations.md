# Knowledge-panel operations

Google decides whether to generate a knowledge panel. The controllable goal is to
make `https://nmapaye.com` the clearest authoritative source for Nathaniel Mapaye
and keep every public fact consistent.

## Current state, September 9, 2026

The public canonical domain is hosted on GitHub Pages. The Sites mirror is
private. Preserve both release workflows; a Sites-only deployment does not
update the canonical domain. Domain ownership is verified in Search Console,
and Search generative AI is set to Include. Campaign drafts and account
measurements are kept locally outside the published site. The launch instructions below are retained
for recovery, not a request to replace functioning DNS records.

## Launch order

1. In GitHub account **Settings → Pages**, add `nmapaye.com` as a verified domain.
2. In GoDaddy DNS, add the TXT challenge shown by GitHub. Keep it permanently.
3. Confirm the TXT record resolves, then click **Verify** in GitHub.
4. In repository **Settings → Pages**, set the custom domain to `nmapaye.com`.
5. Only after GitHub knows the custom domain, configure these GoDaddy records:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `nmapaye.github.io` |

6. Remove any conflicting GoDaddy parking records. Do not create wildcard records.
7. Wait for GitHub's certificate, enable **Enforce HTTPS**, and verify that `www`
   redirects to the apex domain.
8. Keep the apex as the only canonical hostname. A workflow-published Pages site
   does not require a repository `CNAME` file.

GitHub notes that DNS and certificate changes can take up to 24 hours. Use:

```sh
dig _github-pages-challenge-nmapaye.nmapaye.com TXT +short
dig nmapaye.com A +short
dig www.nmapaye.com CNAME +short
curl -I https://nmapaye.com/
curl -I https://www.nmapaye.com/
```

Reference: [GitHub domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
and [GitHub custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Search launch

After HTTPS is live:

1. Add the `nmapaye.com` **Domain property** in Google Search Console.
2. Add its DNS TXT token without removing the GitHub verification token.
3. Submit `https://nmapaye.com/sitemap-index.xml`.
4. Request indexing for:
   - `https://nmapaye.com/`
   - `https://nmapaye.com/about/`
   - `https://nmapaye.com/writing/syslib-concurrency-design/`
   - `https://nmapaye.com/writing/embnode-telemetry-design/`
   - `https://nmapaye.com/writing/aurora-private-caffeine-tracking/`
5. Confirm Search Console can fetch the homepage, article, `robots.txt`, and
   sitemap.
6. Run both Google's Rich Results Test and Schema.org's validator. Treat critical
   errors as release blockers.

Reference: [Google Search Console ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en).

## Identity consistency

Use these exact public facts:

- Name: **Nathaniel Mapaye**
- Alternate name: **Nathaniel Fransiscus Mapaye**
- Descriptor: **Systems and Embedded Engineer**
- Website: `https://nmapaye.com`
- Identity profiles: LinkedIn and GitHub only
- Location: city level only

Update the GitHub profile website and LinkedIn website after the domain is live.
Keep the same headshot and compatible biography facts across both profiles. Do not
publish a phone number, street address, GPA, birth date, unsupported award, or
fabricated identifier.

Replace Carrd with a short notice for 30–60 days:

> Nathaniel Mapaye's portfolio has moved to nmapaye.com.

Link the domain, keep no duplicate biography on Carrd, and then unpublish it.

## Authority cadence

During the 12-week campaign beginning September 9, 2026, publish the SysLib and
EmbNode articles and share technical observations every other week. Afterward,
publish one substantive technical article per quarter. Keep each article grounded
in demonstrable work and link to public source code when appropriate.

Maintain a simple outreach log with:

- date;
- publisher or organizer;
- factual project/person reference requested;
- source materials supplied;
- response and published URL.

Prioritize accurate, editorially independent pages from:

- a public Handshake AI showcase naming Nathaniel and AURORA;
- a UCSC project, symposium, student, or event page;
- a legitimate hackathon or showcase where the project was actually presented.

Do not buy knowledge-panel services, links, reviews, press releases, or
Wikipedia/Wikidata entries. Add ORCID or Wikidata only when a real publication or
credential makes it appropriate.

## Quarterly review

- Check indexed URLs and branded searches for both name variants.
- Correct conflicting public facts at their source.
- Review new backlinks and independent references.
- Publish or schedule the quarter's technical article.
- Check whether **Claim this knowledge panel** appears.
- Keep evidence and source URLs for any future correction request.

If a panel appears, follow [Google's claim process](https://support.google.com/knowledgepanel/answer/9163198?hl=en)
and submit only source-supported corrections.
