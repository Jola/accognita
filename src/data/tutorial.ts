// ============================================================
// TUTORIAL — Texte, mit denen neue Skills vorgestellt werden, und der Spieleinstieg (GDD-11)
// Absorb & Evolve
//
// Vorgabe (Entwickler, 15. November 2026): Ein neuer Skill wird beim ersten
// Mal prominent vorgestellt; man soll lesen können, wie genau er
// funktioniert. Neue Skills erscheinen nacheinander — der nächste erst, wenn
// die Ansicht geschlossen wurde. Bei den ersten beiden Skills (Sehen,
// Bewegen) steht zusätzlich, wie sie das Spiel grundsätzlich bestimmen:
// Sehen muss man erst ausbauen, so erweitert sich das Sichtfeld immer
// weiter. Beim Bewegen: eine Aufforderung, es auszuprobieren; erst danach
// kommt die Beschreibung, dass man nun reisen kann und mit der Zeit immer
// schneller wird.
// Begründung (Entwickler): Am Anfang muss man noch alles verstehen; der
// Spieler soll genug Zeit haben, sich einen neuen Skill anzuschauen.
//
// Die Texte selbst: Vorschlag Claude (offen). Im Nest heißt die Aufforderung
// „Abspalten“ statt „Erheben“, weil das Nest sich nicht erheben kann
// (GDD-10 Abschnitt 2, Vorgabe Entwickler).
// Keine Phaser-Abhängigkeit.
// ============================================================

/** Gilt für den ersten Skill mit Sichtweite (sight_range). */
export const SIGHT_INTRO = [
  "Das ist dein erster Sinn. Noch siehst du nur ganz nah, unscharf und in Graustufen.",
  "Sehen ist ein Skill wie jeder andere: Je länger du siehst, desto besser wird er — dein Sichtfeld wird mit der Zeit immer größer.",
  "Andere Wesen haben andere Augen. Von ihnen kannst du später lernen, weiter und in Farbe zu sehen.",
];

/** Gilt für den ersten Skill mit Bewegung (move_speed), entdeckt im Nest. */
export const MOVE_INTRO_SETTLED = [
  "Ab jetzt kannst du dich bewegen. Das Nest selbst bleibt aber, wo es ist — es ist dein fester Anker.",
  "Um die Welt zu erkunden, schickst du einen Teil von dir los.",
];
// Als Frage (Vorgabe Entwickler, 15. November 2026: Anstöße sind einfache Fragen).
// [VERWORFEN] „Probier es aus: Tippe auf 🧬 Abspalten.“
export const MOVE_TRY_SETTLED = "Was wohl dort draußen ist? Warum schickst du nicht einen Teil von dir los? Tippe auf 🧬 Abspalten.";

/** Derselbe Skill, entdeckt als Reisender (kein Abspalten nötig). */
export const MOVE_INTRO_TRAVELING = [
  "Ab jetzt kannst du dich bewegen.",
];
// [VERWORFEN] „Probier es aus: Schiebe dich mit dem Joystick voran.“
export const MOVE_TRY_TRAVELING = "Warum probierst du es nicht mal aus? Schiebe dich mit dem Joystick voran.";

/** Karte „Auf Reisen“ — nach dem ersten Abspalten. */
export const TRAVEL_TITLE = "Auf Reisen";
export const TRAVEL_TEXT = [
  "Ein Teil von dir ist unterwegs. Schiebe dich mit dem Joystick voran.",
  "Je mehr du dich bewegst, desto besser wird dein Bewegungs-Skill — so reist du mit der Zeit immer schneller.",
  "Findest du einen guten Ort, kannst du dich dort niederlassen. Dann ist dein Fortschritt gesichert, und der Blob arbeitet dort von allein weiter.",
  "Wirst du besiegt, machst du bei einem niedergelassenen Blob weiter — zu Beginn im Nest.",
];

// ============================================================
// SPIELEINSTIEG (GDD-11) — Anstöße, Erklärungen, Entdeckungen
//
// Vorgaben (Entwickler, 15. November 2026):
// - Der Antrieb des Blobs ist ein Gefühl, eine Ahnung oder Neugier. Ein
//   Anstoß ist einfach eine Frage („Warum probierst du es nicht mal aus?“).
//   Wer fragt, bleibt offen. Keine Formulierung „etwas in dir“.
// - Drei Stufen mit je etwa 45 s passen erst einmal (im Spiel ausprobieren).
// - Anlässe fürs Niederlassen: weit vom Nest, guter Ort, wenig HP.
// - Hinweise lassen sich nicht abschalten.
// Texte und übrige Zahlen: Vorschlag Claude, übernommen (15. November 2026: „Passt so“).
// ============================================================

/** Stufe 2 (konkreter Satz) nach so vielen Sekunden, Stufe 3 (Knopf pulsiert) nach dem Doppelten. Vorgabe Entwickler. */
export const HINT_STAGE_SECONDS = 45;
/** Anstoß „Fressen von Hand“: so lange unterwegs ohne Absorb/Analyze (GDD-11 5.3). */
export const HINT_FEED_AFTER_SECONDS = 30;
/** Anstoß „Niederlassen“, Anlass (a): so weit vom Nest (GDD-11 5.5). */
export const HINT_SETTLE_FAR_METERS = 30;
/** Anlass (b): so viele friedliche Wesen in diesem Umkreis, in Wald oder Sumpf. */
export const HINT_SETTLE_PEACEFUL_MIN = 3;
export const HINT_SETTLE_PEACEFUL_RADIUS_PX = 240;
/** … aber nicht direkt am Nest: Dort erntet schon das Nest (Vorschlag Claude, offen). */
export const HINT_SETTLE_PLACE_MIN_NEST_METERS = 12;
/** Anlass (c): HP unter diesem Anteil (und kein Gegner greift an). */
export const HINT_SETTLE_HP_FRACTION = 0.5;
/** Anstoß „Erheben“: so lange bei einem niedergelassenen Blob, der nicht das Nest ist (GDD-11 5.6). */
export const HINT_RISE_AFTER_SECONDS = 60;
/** Der Hinweis nach dem ersten Schaden erklärt nur; er steht so lange und ist dann erledigt (GDD-11 5.4). */
export const HINT_DANGER_SHOW_SECONDS = 14;
/** Erklärung „Kapazität“, wenn sie zum ersten Mal über diesen Anteil steigt (GDD-11 5.10) — vorher spielt sie keine Rolle. */
export const CAPACITY_CARD_FRACTION = 0.8;
/** Entdeckung „gewachsen“: so viele Fasern Körpermasse seit dem letzten Körperwechsel dazugewonnen (2 kg). */
export const GROWN_DISCOVERY_MASS = 20;
/** Entdeckt-Zeile unter dem Blob (GDD-11 7.1). */
export const DISCOVERY_HOLD_MS = 6000;

/** Welcher Knopf in Stufe 3 pulsiert */
export type HintTarget = "absorb_analyze" | "settle" | "rise" | "merge" | "split" | "menu";

export interface HintText {
  /** Stufe 1: Wahrnehmung und Frage */
  ask: string;
  /** Ab Stufe 2: der Satz in Spielbegriffen */
  concrete: string;
  target?: HintTarget;
}

/** Ein Text je Anstoß; Niederlassen und Zurückholen haben je nach Anlass eigene Varianten. */
export const HINTS: Record<string, HintText> = {
  feed: {
    ask: "Riecht da nicht etwas Essbares?",
    concrete: "Komm einem Wesen nahe und tippe auf 💥 Absorb oder 🔍 Analyze.",
    target: "absorb_analyze",
  },
  danger: {
    ask: "Autsch! Ob sich hier wirklich alles fressen lässt?",
    concrete: "Oben siehst du deine HP. Wird es eng, flieh — mit der Zeit heilst du von selbst.",
  },
  settle_far: {
    ask: "So weit weg vom Nest … Warum lässt du dich hier nicht nieder?",
    concrete: "Tippe auf 🌱 Niederlassen.",
    target: "settle",
  },
  settle_place: {
    ask: "Feucht, schattig, Nahrung ringsum. Warum lässt du dich hier nicht nieder?",
    concrete: "Tippe auf 🌱 Niederlassen.",
    target: "settle",
  },
  settle_hurt: {
    ask: "Du bist verletzt, und gerade ist es ruhig. Warum lässt du dich hier nicht nieder?",
    concrete: "Tippe auf 🌱 Niederlassen — dann ist dein Fortschritt gesichert.",
    target: "settle",
  },
  rise: {
    ask: "Hier kennst du schon alles. Wie wäre es mit einem neuen Ort?",
    concrete: "Tippe auf ⬆️ Erheben — dann reist der ganze Blob weiter.",
    target: "rise",
  },
  retrieve_traveling: {
    ask: "Dein vertrockneter Teil liegt noch dort draußen. Warum holst du ihn nicht zurück?",
    concrete: "Folge dem braunen Pfeil am Rand. Berührst du ihn, könnt ihr verschmelzen.",
  },
  retrieve_settled: {
    ask: "Dein vertrockneter Teil liegt noch dort draußen. Warum holst du ihn nicht zurück?",
    concrete: "Tippe auf 🧬 Abspalten und folge dem braunen Pfeil am Rand.",
    target: "split",
  },
  merge: {
    ask: "Ein Teil von dir! Warum werdet ihr nicht wieder eins?",
    concrete: "Tippe auf 🫧 Verschmelzen.",
    target: "merge",
  },
  map: {
    ask: "Zwei Teile von dir, weit voneinander entfernt. Wo sie wohl gerade sind?",
    concrete: "Öffne das Menü 📋 und dort die KARTE. Dort kannst du auch dein Bewusstsein wechseln.",
    target: "menu",
  },
};

export interface CardText {
  kicker: string;
  icon: string;
  title: string;
  lines: string[];
}

/** Erklärungen (Karte, das Spiel hält an), je einmal im ganzen Spiel. Schlüssel = „card:<id>“. */
export const CARDS: Record<string, CardText> = {
  travel: { kicker: "🧬 Abgespalten", icon: "🌍", title: TRAVEL_TITLE, lines: TRAVEL_TEXT },
  settled: {
    kicker: "🌱 Niedergelassen", icon: "🏡", title: "Ein fester Ort",
    lines: [
      "Hier bist du verankert. Wirst du besiegt, kannst du hier weitermachen — dein Fortschritt ist gesichert.",
      "Ein niedergelassener Blob arbeitet von allein, auch wenn du woanders bist. Wähle dazu eine Tätigkeit: Analysieren oder Absorbieren.",
      "Er lernt von den Wesen in seiner Nähe und sammelt, was er absorbiert.",
      "Von hier aus kannst du einen Teil von dir abspalten — oder dich erheben und mit dem ganzen Blob weiterziehen.",
    ],
  },
  rise: {
    kicker: "⬆️ Erhoben", icon: "🌬️", title: "Weiterziehen",
    lines: [
      "Der ganze Blob reist jetzt weiter. Am alten Ort bleibt nichts zurück.",
      "Zum Vergleich: Beim Abspalten bleibt der Blob, wo er ist, und nur ein Teil von dir zieht los.",
      "Findest du einen guten Ort, lass dich wieder nieder.",
    ],
  },
  merge: {
    kicker: "🫧 Verschmolzen", icon: "🫧", title: "Wieder eins",
    lines: [
      "Ihr seid wieder ein Blob. Von jedem Skill zählt der höhere Wert der beiden.",
      "Alles, was ihr gesammelt habt, liegt jetzt zusammen.",
      "So holst du auch zurück, was ein vertrockneter Teil von dir gelernt hat.",
    ],
  },
  capacity: {
    kicker: "🧠 Kapazität", icon: "🧠", title: "Begrenzter Platz",
    lines: [
      "Alles, was du lernst, braucht Platz. Oben bei KAP siehst du, wie viel davon belegt ist.",
      "Jeder neue Skill bringt eigenen Platz mit. Ist alles voll, verdrängt Neues, was du am längsten nicht geübt hast — es verblasst langsam.",
      "Was du schon einmal konntest, lernst du doppelt so schnell wieder.",
    ],
  },
  dried: {
    kicker: "💀 Besiegt", icon: "🍂", title: "Vertrocknet",
    lines: [
      "Du vertrocknest — aber du stirbst nicht. Ein Teil von dir lebt weiter.",
      "Dein vertrockneter Körper bleibt liegen, wo du besiegt wurdest, und behält, was er gelernt hat.",
      "Du machst bei einem niedergelassenen Blob weiter. Verschmilzt du später mit dem vertrockneten Teil, bekommst du zurück, was er dir voraushat.",
    ],
  },
};

/** Entdeckungen: erst festgehalten, nachdem der Spieler sie selbst gemacht hat (GDD-11 4.1). Schlüssel = „find:<id>“. */
export const DISCOVERIES: Record<string, { icon: string; text: string }> = {
  absorb_vanish: { icon: "💥", text: "Absorbiertes verschwindet — und wächst mit der Zeit nach." },
  analyze_keep: { icon: "🔍", text: "Analysieren lässt das Wesen in Ruhe — du lernst trotzdem von ihm." },
  plant_fiber: { icon: "🌿", text: "Aus Gras gewinnst du Pflanzenfasern — Nahrung, aus der dein Körper wächst." },
  grown: { icon: "🫧", text: "Du bist gewachsen. Aus verdauten Fasern wird Körper: mehr HP, mehr Reichweite." },
};

// Stand: 15. November 2026 — Anstöße, Erklärungen und Entdeckungen des Spieleinstiegs (GDD-11); davor Erstfassung
