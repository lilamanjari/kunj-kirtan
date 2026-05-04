import Link from "next/link";
import SubpageHeader from "@/lib/components/SubpageHeader";

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

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <SubpageHeader
          title="About Us"
          subtitle="What this archive is, why it exists, and how to help."
        />

        <section className="-mt-10 rounded-[1.75rem] border border-[#ead8d2] bg-white/88 px-6 py-6 shadow-[0_18px_40px_rgba(154,88,68,0.14)] backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            What This Is
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-stone-700">
            Kunj Kirtan is a lovingly curated archive of kirtan recordings in
            the line of Srila BV Narayana Gosvami Maharaja.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-stone-700">
            Most of the recordings are made in Sri Radhe Kunj, Vrindavan. The
            archive contains bhajans, maha mantras, and selected hari katha.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-stone-700">
            The aim is to make these recordings easy to discover, share, and
            listen to, without ads or subscriptions.
          </p>
        </section>

        <section className="rounded-[1.75rem] border border-[#ead8d2] bg-[linear-gradient(135deg,rgba(78,41,33,0.96)_0%,rgba(109,33,58,0.94)_100%)] px-6 py-6 text-white shadow-[0_20px_48px_rgba(93,45,39,0.22)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/72">
            Why It Exists
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-white/88">
            Many recordings circulate informally and risk getting buried in
            folders, chat threads, and old devices. This archive tries to keep
            them alive in a form that is searchable, playable, and gradually
            better described over time.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-white/88">
            The project also makes room to tag rare gems, festival moods, lead
            singers, and other small bits of metadata that help in discovering
            tracks.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-white/88">
            The original vision was to share the sweet mood of Sri Radhe Kunj
            kirtan with devotees all over the world, but the devotees quickly
            started contributing cherished Gaudiya Math kirtans from the time of
            our beloved Srila Gurudeva. It is a great honor to host these
            precious kirtans as well here on Kunj Kirtan.
          </p>
        </section>

        <section className="rounded-[1.75rem] border border-[#ead8d2] bg-white/86 px-6 py-6 shadow-[0_16px_36px_rgba(154,88,68,0.1)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                How To Contribute
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Here's how you can contribute right now! More options will come
                as soon as the tooling is ready.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[#eadbcf] bg-[linear-gradient(135deg,rgba(255,252,249,0.98)_0%,rgba(248,237,231,0.96)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(154,88,68,0.08)]">
              <h3 className="text-sm font-semibold text-stone-800">
                Code Contributions
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                If you want to fix bugs or propose improvements, the easiest
                path today is through GitHub. You can open an issue, discuss an
                idea, or send a pull request directly.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                >
                  View Repository
                </a>
                <a
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                >
                  Open Issues
                </a>
                <a
                  href={GITHUB_PULLS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
                >
                  Pull Requests
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5d0cb] bg-[linear-gradient(135deg,rgba(89,49,40,0.94)_0%,rgba(123,55,76,0.9)_100%)] px-4 py-4 text-white shadow-[0_14px_30px_rgba(93,45,39,0.16)]">
              <h3 className="text-sm font-semibold text-white">
                Kirtan Contribution
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/85">
                You can help by sharing recordings that belong in the archive.
                The easiest path right now is WeTransfer.
              </p>
              <div className="mt-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">
                  Before uploading, please include as much metadata as possible
                  in the file name.
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/82">
                  <li>Lead singer name</li>
                  <li>Track title</li>
                  <li>Recorded location</li>
                  <li>Recorded date if known</li>
                  <li>
                    Extra notes such as occasion or festival when relevant
                  </li>
                </ul>
                <a
                  href={WETRANSFER_REQUEST_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-white/28 bg-white/92 px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-white"
                >
                  Upload via WeTransfer
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadbcf] bg-[linear-gradient(135deg,rgba(255,252,249,0.98)_0%,rgba(248,237,231,0.96)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(154,88,68,0.08)]">
              <h3 className="text-sm font-semibold text-stone-800">
                Audio Remastering
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                If you would like to help with audio remastering, cleanup, or
                restoration work, let's get in touch and have a chat!
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
              >
                Contact via WhatsApp
              </a>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                The link opens a chat with a prefilled message so we can quickly
                understand what kind of help you are offering.
              </p>
            </div>

            <div className="rounded-2xl border border-[#efe0d4] bg-[linear-gradient(135deg,rgba(255,247,240,0.98)_0%,rgba(252,241,234,0.94)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(154,88,68,0.08)]">
              <h3 className="text-sm font-semibold text-stone-800">
                Financial Support
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Monetary donations help cover storage, database, CDN, app
                hosting, and other operating costs as the archive grows.
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
                    Donate {link.label}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                Payments open in Stripe Checkout, where Apple Pay and Google Pay
                may appear automatically when supported on the donor&apos;s
                device and browser.
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                The payment page says{" "}
                <span className="font-medium text-stone-600">
                  Pay SoulSpace Journeys
                </span>{" "}
                because SoulSpace Journeys is the formal entity operating the
                Stripe account. Donations are used 100% for the operating costs
                of Kunj Kirtan.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#ead8d2] bg-white/84 px-6 py-6 shadow-[0_16px_36px_rgba(154,88,68,0.1)] backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            Guiding Principle
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-stone-700">
            Kunj Kirtan exists to make these recordings discoverable,
            searchable, and easy to listen to, so that a devotee anywhere in the
            world can quickly find the kirtan they are longing for.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-stone-700">
            The hope is that the archive feels like an oasis in the desert:
            nourishing, and full of remembrance, where a person can arrive,
            search with ease, and immediately enter the mood of kirtan.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex rounded-full border border-[#ead8d2] bg-white px-4 py-2 text-sm font-medium text-[#8f4350] shadow-sm transition hover:bg-[#fff7f3]"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
