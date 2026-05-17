"use client";

import SubpageHeader from "@/lib/components/SubpageHeader";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { useLocale, useDictionary } from "@/lib/i18n/LocaleProvider";
import { getAboutContent } from "@/lib/i18n/content/about";

const GITHUB_REPO_URL = "https://github.com/lilamanjari/kunj-kirtan";
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const GITHUB_PULLS_URL = `${GITHUB_REPO_URL}/pulls`;
const WETRANSFER_REQUEST_URL = "https://we.tl/r-4Hq0GZJrQaMmOf1t";
const WHATSAPP_URL =
  "https://wa.me/4798821212?text=Hello%2C%20I%27d%20like%20to%20help%20with%20audio%20remastering%20for%20Kunj%20Kirtan.";
const DONATION_LINKS = [
  {
    label: "$5",
    href: "https://buy.stripe.com/cNi14obSI6kgbeNbPIfYY0b",
  },
  {
    label: "$10",
    href: "https://buy.stripe.com/aFa28s0a0dMIeqZcTMfYY0c",
  },
  {
    label: "$20",
    href: "https://buy.stripe.com/3cI5kE7Cs6kg2IhcTMfYY0d",
  },
  {
    label: "$100",
    href: "https://buy.stripe.com/7sY7sM6yoeQMeqZf1UfYY0e",
  },
] as const;

export default function AboutPageContent() {
  const locale = useLocale();
  const dictionary = useDictionary();
  const content = getAboutContent(locale);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md space-y-8 px-5 py-6">
        <SubpageHeader
          title={content.headerTitle}
          subtitle={content.headerSubtitle}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <section className="-mt-10 rounded-[1.75rem] border border-[#ead8d2] bg-white/88 px-6 py-6 shadow-[0_18px_40px_rgba(154,88,68,0.14)] backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            {content.whatThisIsTitle}
          </h2>
          {content.whatThisIsParagraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-[15px] leading-7 text-stone-700">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="rounded-[1.75rem] border border-[#ead8d2] bg-[linear-gradient(135deg,rgba(78,41,33,0.96)_0%,rgba(109,33,58,0.94)_100%)] px-6 py-6 text-white shadow-[0_20px_48px_rgba(93,45,39,0.22)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/72">
            {content.whyItExistsTitle}
          </h2>
          {content.whyItExistsParagraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-[15px] leading-7 text-white/88">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="rounded-[1.75rem] border border-[#ead8d2] bg-white/86 px-6 py-6 shadow-[0_16px_36px_rgba(154,88,68,0.1)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                {content.howToContributeTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {content.howToContributeIntro}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[#eadbcf] bg-[linear-gradient(135deg,rgba(255,252,249,0.98)_0%,rgba(248,237,231,0.96)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(154,88,68,0.08)]">
              <h3 className="text-sm font-semibold text-stone-800">
                {content.codeContributionsTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {content.codeContributionsBody}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                >
                  {content.viewRepository}
                </a>
                <a
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                >
                  {content.openIssues}
                </a>
                <a
                  href={GITHUB_PULLS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                >
                  {content.pullRequests}
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5d0cb] bg-[linear-gradient(135deg,rgba(89,49,40,0.94)_0%,rgba(123,55,76,0.9)_100%)] px-4 py-4 text-white shadow-[0_14px_30px_rgba(93,45,39,0.16)]">
              <h3 className="text-sm font-semibold text-white">
                {content.kirtanContributionTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/85">
                {content.kirtanContributionBody}
              </p>
              <div className="mt-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">{content.uploadIntro}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/82">
                  {content.uploadChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <a
                  href={WETRANSFER_REQUEST_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-white/28 bg-white/92 px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-white"
                >
                  {content.uploadViaWeTransfer}
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadbcf] bg-[linear-gradient(135deg,rgba(255,252,249,0.98)_0%,rgba(248,237,231,0.96)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(154,88,68,0.08)]">
              <h3 className="text-sm font-semibold text-stone-800">
                {content.audioRemasteringTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {content.audioRemasteringBody}
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
              >
                {content.contactViaWhatsApp}
              </a>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                {content.audioRemasteringFootnote}
              </p>
            </div>

            <div className="rounded-2xl border border-[#efe0d4] bg-[linear-gradient(135deg,rgba(255,247,240,0.98)_0%,rgba(252,241,234,0.94)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(154,88,68,0.08)]">
              <h3 className="text-sm font-semibold text-stone-800">
                {content.financialSupportTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {content.financialSupportBody}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DONATION_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                  >
                    {content.donatePrefix} {link.label}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                {content.financialSupportFootnoteOne}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {content.financialSupportFootnoteTwo}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#ead8d2] bg-white/84 px-6 py-6 shadow-[0_16px_36px_rgba(154,88,68,0.1)] backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            {content.guidingPrincipleTitle}
          </h2>
          {content.guidingPrincipleParagraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-[15px] leading-7 text-stone-700">
              {paragraph}
            </p>
          ))}
          <div className="mt-5">
            <LocalizedLink
              href="/"
              className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
            >
              {dictionary.common.backToHome}
            </LocalizedLink>
          </div>
        </section>
      </main>
    </div>
  );
}
