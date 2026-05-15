import type { Locale } from "@/lib/i18n/config";

type AboutContent = {
  headerTitle: string;
  headerSubtitle: string;
  whatThisIsTitle: string;
  whatThisIsParagraphs: string[];
  whyItExistsTitle: string;
  whyItExistsParagraphs: string[];
  howToContributeTitle: string;
  howToContributeIntro: string;
  codeContributionsTitle: string;
  codeContributionsBody: string;
  viewRepository: string;
  openIssues: string;
  pullRequests: string;
  kirtanContributionTitle: string;
  kirtanContributionBody: string;
  uploadIntro: string;
  uploadChecklist: string[];
  uploadViaWeTransfer: string;
  audioRemasteringTitle: string;
  audioRemasteringBody: string;
  contactViaWhatsApp: string;
  audioRemasteringFootnote: string;
  financialSupportTitle: string;
  financialSupportBody: string;
  donatePrefix: string;
  financialSupportFootnoteOne: string;
  financialSupportFootnoteTwo: string;
  guidingPrincipleTitle: string;
  guidingPrincipleParagraphs: string[];
};

const enContent: AboutContent = {
  headerTitle: "About Us",
  headerSubtitle: "What this archive is, why it exists, and how to help.",
  whatThisIsTitle: "What This Is",
  whatThisIsParagraphs: [
    "Kunj Kirtan is a lovingly curated archive of kirtan recordings in the line of Srila BV Narayana Gosvami Maharaja.",
    "Most of the recordings are made in Sri Radhe Kunj, Vrindavan. The archive contains bhajans, maha mantras, and selected hari katha.",
    "The aim is to make these recordings easy to discover, share, and listen to, without ads or subscriptions.",
  ],
  whyItExistsTitle: "Why It Exists",
  whyItExistsParagraphs: [
    "Many recordings circulate informally and risk getting buried in folders, chat threads, and old devices. This archive tries to keep them alive in a form that is searchable, playable, and gradually better described over time.",
    "The project also makes room to tag rare gems, festival moods, lead singers, and other small bits of metadata that help in discovering tracks.",
    "The original vision was to share the sweet mood of Sri Radhe Kunj kirtan with devotees all over the world, but the devotees quickly started contributing cherished Gaudiya Math kirtans from the time of our beloved Srila Gurudeva. It is a great honor to host these precious kirtans as well here on Kunj Kirtan.",
  ],
  howToContributeTitle: "How To Contribute",
  howToContributeIntro:
    "Here's how you can contribute right now! More options will come as soon as the tooling is ready.",
  codeContributionsTitle: "Code Contributions",
  codeContributionsBody:
    "If you want to fix bugs or propose improvements, the easiest path today is through GitHub. You can open an issue, discuss an idea, or send a pull request directly.",
  viewRepository: "View Repository",
  openIssues: "Open Issues",
  pullRequests: "Pull Requests",
  kirtanContributionTitle: "Kirtan Contribution",
  kirtanContributionBody:
    "You can help by sharing recordings that belong in the archive. The easiest path right now is WeTransfer.",
  uploadIntro:
    "Before uploading, please include as much metadata as possible in the file name.",
  uploadChecklist: [
    "Lead singer name",
    "Track title",
    "Recorded location",
    "Recorded date if known",
    "Extra notes such as occasion or festival when relevant",
  ],
  uploadViaWeTransfer: "Upload via WeTransfer",
  audioRemasteringTitle: "Audio Remastering",
  audioRemasteringBody:
    "If you would like to help with audio remastering, cleanup, or restoration work, let's get in touch and have a chat!",
  contactViaWhatsApp: "Contact via WhatsApp",
  audioRemasteringFootnote:
    "The link opens a chat with a prefilled message so we can quickly understand what kind of help you are offering.",
  financialSupportTitle: "Financial Support",
  financialSupportBody:
    "Monetary donations help cover storage, database, CDN, app hosting, and other operating costs as the archive grows.",
  donatePrefix: "Donate",
  financialSupportFootnoteOne:
    "Payments open in Stripe Checkout, where Apple Pay and Google Pay may appear automatically when supported on the donor's device and browser.",
  financialSupportFootnoteTwo:
    "The payment page says Pay SoulSpace Journeys because SoulSpace Journeys is the formal entity operating the Stripe account. Donations are used 100% for the operating costs of Kunj Kirtan.",
  guidingPrincipleTitle: "Guiding Principle",
  guidingPrincipleParagraphs: [
    "Kunj Kirtan exists to make these recordings discoverable, searchable, and easy to listen to, so that a devotee anywhere in the world can quickly find the kirtan they are longing for.",
    "The hope is that the archive feels like an oasis in the desert: nourishing, and full of remembrance, where a person can arrive, search with ease, and immediately enter the mood of kirtan.",
  ],
};

const ruContent: AboutContent = {
  headerTitle: "О проекте",
  headerSubtitle: "Что это за архив, зачем он существует и как можно помочь.",
  whatThisIsTitle: "Что это",
  whatThisIsParagraphs: [
    "Kunj Kirtan — это бережно собранный архив записей киртана в линии Шрилы Б.В. Нараяны Госвами Махараджа.",
    "Большая часть записей сделана в Sri Radhe Kunj во Вриндаване. Архив включает бхаджаны, маха-мантры и избранную хари-катху.",
    "Цель проекта — сделать эти записи удобными для поиска, прослушивания и распространения, без рекламы и подписок.",
  ],
  whyItExistsTitle: "Зачем он существует",
  whyItExistsParagraphs: [
    "Многие записи распространяются неформально и легко теряются среди папок, чатов и старых устройств. Этот архив старается сохранить их в форме, где их можно искать, слушать и постепенно лучше описывать.",
    "Проект также позволяет отмечать редкие жемчужины, фестивальные настроения, ведущих исполнителей и другие небольшие детали, которые помогают находить нужные записи.",
    "Изначальный замысел состоял в том, чтобы поделиться сладостным настроением киртана Sri Radhe Kunj с преданными по всему миру, но очень быстро преданные начали присылать дорогие сердцу киртаны Гаудия Матха времён нашего любимого Шрилы Гурудевы. Для нас большая честь хранить и эти драгоценные киртаны на Kunj Kirtan.",
  ],
  howToContributeTitle: "Как помочь",
  howToContributeIntro:
    "Вот как вы можете помочь уже сейчас. По мере готовности инструментов появятся и другие варианты.",
  codeContributionsTitle: "Помощь с кодом",
  codeContributionsBody:
    "Если вы хотите исправить ошибки или предложить улучшения, самый простой путь сейчас — через GitHub. Можно открыть issue, обсудить идею или сразу отправить pull request.",
  viewRepository: "Репозиторий",
  openIssues: "Issues",
  pullRequests: "Pull Requests",
  kirtanContributionTitle: "Добавление киртанов",
  kirtanContributionBody:
    "Вы можете помочь, присылая записи, которым есть место в архиве. Сейчас самый простой путь — через WeTransfer.",
  uploadIntro:
    "Перед загрузкой, пожалуйста, укажите в имени файла как можно больше метаданных.",
  uploadChecklist: [
    "Имя ведущего исполнителя",
    "Название трека",
    "Место записи",
    "Дата записи, если известна",
    "Дополнительные заметки, например событие или фестиваль, если это уместно",
  ],
  uploadViaWeTransfer: "Загрузить через WeTransfer",
  audioRemasteringTitle: "Ремастеринг аудио",
  audioRemasteringBody:
    "Если вы хотите помочь с ремастерингом, очисткой или восстановлением аудио, давайте свяжемся и обсудим это.",
  contactViaWhatsApp: "Связаться через WhatsApp",
  audioRemasteringFootnote:
    "Ссылка открывает чат с готовым сообщением, чтобы мы быстрее поняли, какую помощь вы предлагаете.",
  financialSupportTitle: "Финансовая поддержка",
  financialSupportBody:
    "Пожертвования помогают покрывать расходы на хранение, базу данных, CDN, хостинг приложения и другие операционные затраты по мере роста архива.",
  donatePrefix: "Пожертвовать",
  financialSupportFootnoteOne:
    "Оплата открывается в Stripe Checkout, где при поддержке устройства и браузера могут автоматически появиться Apple Pay и Google Pay.",
  financialSupportFootnoteTwo:
    "На странице оплаты указано Pay SoulSpace Journeys, потому что SoulSpace Journeys является официальной организацией, управляющей аккаунтом Stripe. Все пожертвования на 100% идут на операционные расходы Kunj Kirtan.",
  guidingPrincipleTitle: "Главный принцип",
  guidingPrincipleParagraphs: [
    "Kunj Kirtan существует для того, чтобы эти записи было легко находить, искать и слушать, чтобы преданный в любой точке мира мог быстро найти тот киртан, к которому стремится сердце.",
    "Надежда в том, чтобы архив ощущался как оазис в пустыне: питающий, наполненный памятованием, куда человек может прийти, легко найти нужное и сразу войти в настроение киртана.",
  ],
};

export function getAboutContent(locale: Locale): AboutContent {
  return locale === "ru" ? ruContent : enContent;
}
