type VariantId =
  | "regular"
  | "1"
  | "2"
  | "4"
  | "5"
  | "7"
  | "8"
  | "9"
  | "15"
  | "12"
  | "19"
  | "28"
  | "128"
  | "1289";

type DemoItem = {
  id: string;
  title: string;
  singer: string;
  date: string;
  duration: string;
  variant: VariantId;
};

const items: DemoItem[] = [
  {
    id: "regular-a",
    title: "Bhaja Re Bhaja Re Amara Mana",
    singer: "Avadhuta Maharaja",
    date: "5 Dec 2025",
    duration: "11:41",
    variant: "regular",
  },
  {
    id: "variant-1",
    title: "Cintamani Maya",
    singer: "Avadhuta Maharaja",
    date: "23 Oct 2025",
    duration: "5:59",
    variant: "1",
  },
  {
    id: "regular-b",
    title: "Radhika Carana Renu",
    singer: "Avadhuta Maharaja",
    date: "14 Dec 2025",
    duration: "10:18",
    variant: "regular",
  },
  {
    id: "variant-2",
    title: "Madhava Bahuta Minati",
    singer: "KKM",
    date: "23 Jan 2026",
    duration: "7:28",
    variant: "2",
  },
  {
    id: "regular-c",
    title: "Sri Ganga Stotram",
    singer: "KKM",
    date: "23 Jan 2026",
    duration: "6:31",
    variant: "regular",
  },
  {
    id: "variant-4",
    title: "Jaya Radha Madhava With MM",
    singer: "AM",
    date: "16 Feb 2026",
    duration: "14:12",
    variant: "4",
  },
  {
    id: "regular-d",
    title: "Hari Hari Kabe Mora",
    singer: "AM",
    date: "15 Feb 2026",
    duration: "8:02",
    variant: "regular",
  },
  {
    id: "variant-5",
    title: "Sakhe Kalaya Gauram",
    singer: "Giri Maharaja",
    date: "14 Feb 2026",
    duration: "9:47",
    variant: "5",
  },
  {
    id: "regular-e",
    title: "Jaya Jaya Radhe Krishna Govinda",
    singer: "RM",
    date: "26 Dec 2025",
    duration: "13:09",
    variant: "regular",
  },
  {
    id: "variant-7",
    title: "Kalayati Nayanam",
    singer: "Gopal Prabhu",
    date: "9 Jan 2026",
    duration: "12:55",
    variant: "7",
  },
  {
    id: "regular-f",
    title: "Nrsimha Kavacam Stotram",
    singer: "AM",
    date: "11 Jan 2026",
    duration: "17:03",
    variant: "regular",
  },
  {
    id: "variant-8",
    title: "Ananda Khanda",
    singer: "KKM",
    date: "31 Jan 2026",
    duration: "6:18",
    variant: "8",
  },
  {
    id: "variant-9",
    title: "Rati Sukha Sare Gatam",
    singer: "RM",
    date: "9 Jan 2026",
    duration: "8:44",
    variant: "9",
  },
  {
    id: "regular-g",
    title: "Radha Krishna Bol Bol",
    singer: "RM",
    date: "8 Jan 2026",
    duration: "7:16",
    variant: "regular",
  },
  {
    id: "variant-15",
    title: "Vrndavana Ramya Sthana",
    singer: "Avadhuta Maharaja",
    date: "10 Dec 2025",
    duration: "8:26",
    variant: "15",
  },
  {
    id: "variant-12",
    title: "Jaya Radhe Jaya Krsna",
    singer: "Gauranga Das",
    date: "16 Feb 2026",
    duration: "6:54",
    variant: "12",
  },
  {
    id: "variant-19",
    title: "Hari Hari Kabe Mora",
    singer: "AM",
    date: "15 Feb 2026",
    duration: "8:02",
    variant: "19",
  },
  {
    id: "variant-28",
    title: "Sri Guru Carana Padma",
    singer: "KKM",
    date: "31 Jan 2026",
    duration: "5:42",
    variant: "28",
  },
  {
    id: "variant-128",
    title: "Madhurastakam",
    singer: "Avadhuta Maharaja",
    date: "10 Dec 2025",
    duration: "9:33",
    variant: "128",
  },
  {
    id: "variant-1289",
    title: "Sakhe Kalaya Gauram",
    singer: "KKM",
    date: "3 Feb 2026",
    duration: "11:08",
    variant: "1289",
  },
];

function variantClasses(variant: VariantId) {
  switch (variant) {
    case "1":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)]",
        border: "border-amber-200/90",
        badge: "1",
      };
    case "2":
      return {
        card: "bg-white",
        border: "border-amber-300/90 shadow-[0_8px_24px_rgba(217,119,6,0.08)]",
        badge: "2",
      };
    case "4":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,252,247,1)_100%)]",
        border:
          "border-amber-200/80 before:absolute before:left-5 before:right-5 before:top-[4.15rem] before:h-px before:bg-[linear-gradient(90deg,transparent_0%,rgba(251,191,36,0.18)_22%,rgba(16,185,129,0.14)_52%,rgba(251,191,36,0.12)_82%,transparent_100%)]",
        badge: "4",
      };
    case "5":
      return {
        card: "bg-white after:absolute after:left-5 after:right-28 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-amber-200/90 after:to-transparent",
        border: "border-amber-100/90",
        badge: "5",
      };
    case "7":
      return {
        card: "bg-[radial-gradient(circle_at_top_right,rgba(254,243,199,0.34),transparent_18%),linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,252,248,1)_100%)]",
        border: "border-amber-200/80 shadow-[0_10px_24px_rgba(16,185,129,0.05)]",
        badge: "7",
      };
    case "8":
      return {
        card: "bg-white",
        border: "border-amber-200/80",
        badge: "8",
        duration:
          "bg-[linear-gradient(135deg,rgba(254,243,199,0.9)_0%,rgba(220,252,231,0.95)_55%,rgba(236,253,245,1)_100%)] text-emerald-800 ring-1 ring-amber-200/60",
      };
    case "9":
      return {
        card: "bg-white before:absolute before:right-0 before:top-0 before:h-14 before:w-14 before:rounded-tr-[1rem] before:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),rgba(251,191,36,0.08)_32%,transparent_68%)]",
        border: "border-amber-200/80",
        badge: "9",
      };
    case "12":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)]",
        border: "border-amber-300/90 shadow-[0_8px_24px_rgba(217,119,6,0.08)]",
        badge: "1+2",
      };
    case "15":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)] after:absolute after:left-5 after:right-28 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-amber-200/90 after:to-transparent",
        border: "border-amber-200/90",
        badge: "1+5",
      };
    case "19":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)] before:absolute before:right-0 before:top-0 before:h-14 before:w-14 before:rounded-tr-[1rem] before:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),rgba(251,191,36,0.08)_32%,transparent_68%)]",
        border: "border-amber-200/90",
        badge: "1+9",
      };
    case "28":
      return {
        card: "bg-white",
        border: "border-amber-300/90 shadow-[0_8px_24px_rgba(217,119,6,0.08)]",
        badge: "2+8",
        duration:
          "bg-[linear-gradient(135deg,rgba(254,243,199,0.9)_0%,rgba(220,252,231,0.95)_55%,rgba(236,253,245,1)_100%)] text-emerald-800 ring-1 ring-amber-200/60",
      };
    case "128":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)]",
        border: "border-amber-300/90 shadow-[0_8px_24px_rgba(217,119,6,0.08)]",
        badge: "1+2+8",
        duration:
          "bg-[linear-gradient(135deg,rgba(254,243,199,0.9)_0%,rgba(220,252,231,0.95)_55%,rgba(236,253,245,1)_100%)] text-emerald-800 ring-1 ring-amber-200/60",
      };
    case "1289":
      return {
        card: "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)] before:absolute before:right-0 before:top-0 before:h-14 before:w-14 before:rounded-tr-[1rem] before:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),rgba(251,191,36,0.08)_32%,transparent_68%)]",
        border: "border-amber-300/90 shadow-[0_8px_24px_rgba(217,119,6,0.08)]",
        badge: "1+2+8+9",
        duration:
          "bg-[linear-gradient(135deg,rgba(254,243,199,0.9)_0%,rgba(220,252,231,0.95)_55%,rgba(236,253,245,1)_100%)] text-emerald-800 ring-1 ring-amber-200/60",
      };
    default:
      return {
        card: "bg-white",
        border: "border-rose-100",
        badge: "",
      };
  }
}

export default function RareGemLabPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
            Rare Gem Lab
          </p>
          <h1 className="font-script text-3xl font-semibold">Card variants</h1>
          <p className="text-sm text-stone-500">
            Regular cards are mixed between six discreet rare-gem treatments.
          </p>
        </header>

        <ul className="mt-6 space-y-4">
          {items.map((item) => {
            const styles = variantClasses(item.variant);

            return (
              <li
                key={item.id}
                className={`relative rounded-xl border px-4 py-3 shadow-sm ${styles.card} ${styles.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {styles.badge ? (
                        <span className="mr-1 rounded-full bg-stone-900/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-stone-500">
                          {styles.badge}
                        </span>
                      ) : null}
                      {item.singer}
                    </p>
                    <p className="mt-1 truncate text-xs text-stone-500">
                      {item.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ${styles.duration ?? ""}`}
                    >
                      {item.duration}
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center text-stone-600">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path d="M8 5v14l11-7z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
