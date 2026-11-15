// ============================================================
// STATS VIEW — Werte-Tab im Spielmenü: alle Charakterwerte des Blobs
//
// Selbstständiges DOM-Modul, liest window.gameState. Kein Phaser.
// Jeder Wert kommt aus derselben Funktion, die auch das Spiel aufruft
// (StatsSystem, CombatSystem, ProgressionSystem, StatusEffectSystem) —
// Anzeige und tatsächliche Werte können nicht auseinanderlaufen.
// Das Spiel ist pausiert, solange das Menü offen ist; neu gezeichnet wird
// beim Öffnen des Tabs.
// ============================================================

import type { PlayerState, GameState } from "../types/GameState.js";
import type { BlobMeta } from "../types/Blob.js";
import { ENTITY_MAP } from "../data/entities.js";
import { MATERIAL_MAP } from "../data/materials.js";
import { ACTION_SECONDS } from "../data/blobs.js";
import { planActivity, calcWorkRange } from "../systems/SettlementSystem.js";
import { getPlayerVision } from "../systems/BodySystem.js";
import type { Attribute } from "../types/Skill.js";
import { ALL_SKILLS } from "../data/skills.js";
import { MILLI, MAX_PERCENT_REDUCTION, MP_REGEN_MILLI_PER_SECOND } from "../data/balance.js";
import { getCharacterStats, describePlayerSkillValues } from "../systems/StatsSystem.js";
import { formatPlayerSkillDamage } from "../systems/CombatSystem.js";
import { getRegenerationRate } from "../systems/StatusEffectSystem.js";
import {
  getCapacityInfo, getRankInfo, getLearningEffort, getCoreProgress, levelFromProgress,
} from "../systems/ProgressionSystem.js";

const num = (n: number, digits = 1) => n.toLocaleString("de-DE", { maximumFractionDigits: digits });
const hp = (milli: number, digits = 1) => num(milli / MILLI, digits);
const pct = (x: number) => `${num(x * 100, 0)} %`;

function group(title: string, rows: [string, string, string?][]): string {
  if (!rows.length) return "";
  return `<div class="stv-group">${title}</div><table class="stv-table">${rows.map(([k, v, note]) =>
    `<tr><th>${k}</th><td>${v}${note ? `<small>${note}</small>` : ""}</td></tr>`).join("")}</table>`;
}

/**
 * Niedergelassen (GDD-10 Abschnitt 13.5): Tätigkeit, Quellen und Ertrag pro
 * Stunde statt Tempo und Angriffen. Der Ertrag kommt aus derselben Rechnung
 * wie die Tätigkeit selbst (SettlementSystem.planActivity) — bei den
 * jetzigen Stufen, vor Kapazitätsgrenze und Wiederlern-Bonus.
 */
function settledHtml(p: PlayerState, meta: BlobMeta): string {
  const blind = getPlayerVision(p).range <= 0;
  const activityName = meta.activity === "analyze" ? "🔍 Analysieren" : meta.activity === "absorb" ? "💥 Absorbieren"
    : meta.activity === "rest" ? "💤 Ruhen" : "keine gewählt";
  const range = calcWorkRange(p.bodyMass, !!meta.nest);
  const sources = meta.sources ?? [];
  const work: [string, string, string?][] = [
    ["⚙️ Tätigkeit", activityName, meta.activity && meta.activity !== "rest" ? `eine Aktion alle ${num(ACTION_SECONDS, 0)} s` : "kein Ertrag"],
    ["🕸️ Arbeitsreichweite", `${num(range, 0)} px`, meta.nest ? "das Nest gilt als ausgewachsen" : "wächst mit der Größe"],
  ];
  const srcRows: [string, string, string?][] = sources.map((src) => {
    const def = ENTITY_MAP.get(src.entityId);
    const label = blind ? "❓ Etwas" : `${def?.icon ?? ""} ${def?.name ?? src.entityId}`;
    return [label, `× ${src.count}`, `Stufe ${def?.level ?? "?"} · wächst nach in ${num(src.respawnSeconds, 0)} s`];
  });

  const plan = planActivity(p, meta.activity, sources, 3600);
  const yieldRows: [string, string, string?][] = [];
  if (plan.attempts > 0) {
    yieldRows.push(["Aktionen", `${num(plan.attempts, 0)} je Stunde`, `davon erfolgreich ${num(plan.successes, 0)}`]);
    const core = meta.activity === "absorb" ? "💥 Absorb" : "🔍 Analyze";
    yieldRows.push([core, `+${num(plan.coreXp, 0)} XP/h`]);
    for (const [id, xp] of Object.entries(plan.skillXp)) {
      const def = ALL_SKILLS.get(id);
      yieldRows.push([`${def?.icon ?? ""} ${def?.name ?? id}`, `+${num(xp, 0)} XP/h`]);
    }
    for (const [id, finds] of Object.entries(plan.finds)) {
      const def = ALL_SKILLS.get(id);
      const have = meta.carry?.[`find:${id}`] ?? 0;
      yieldRows.push([blind ? "❓ Neuer Skill" : `✨ ${def?.name ?? id}`, `${num(finds, 2)} Funde/h`,
        `neu entdeckt bei 1 Fund · bisher ${num(have, 2)}`]);
    }
    for (const [id, amount] of Object.entries(plan.materials)) {
      const m = MATERIAL_MAP.get(id);
      yieldRows.push([`${m?.icon ?? ""} ${m?.name ?? id}`, `${num(amount, 1)}/h`]);
    }
  }
  const yieldNote = !meta.activity ? "Wähle eine Tätigkeit." : meta.activity === "rest" ? "Ruhen bringt nichts."
    : sources.length === 0 ? "Keine friedlichen Wesen in Reichweite." : "";

  return [
    group("Tätigkeit (niedergelassen)", work),
    group("Quellen (erntet nur dieser Blob)", srcRows.length ? srcRows : [["—", "keine friedlichen Wesen in Reichweite"]]),
    group("Ertrag pro Stunde (jetzige Stufen, vor Kapazitätsgrenze)", yieldRows.length ? yieldRows : [["—", yieldNote || "nichts"]]),
  ].join("");
}

function statsHtml(p: PlayerState, meta?: BlobMeta): string {
  const settled = meta?.form === "settled";
  const s = getCharacterStats(p, getRegenerationRate(p), MP_REGEN_MILLI_PER_SECOND);
  const cap = getCapacityInfo(p);
  const from = (list: string[]) => (list.length ? `aus ${list.join(", ")}` : "noch kein Skill");
  // Bekannte Angriffe, die mit der Eigenschaft skalieren: „Biss +8 %/Punkt“
  const scaledBy = (attr: Attribute) => {
    const list = [...p.discoveredSkills.keys()].flatMap((id) => {
      const def = ALL_SKILLS.get(id);
      const sc = def?.scaling?.find((x) => x.attribute === attr);
      return def && sc ? [`${def.name} +${num(sc.perPoint * 100, 1)} %/Punkt`] : [];
    });
    return list.length ? list.join(", ") : "keinen bekannten Angriff";
  };

  const body: [string, string, string?][] = [
    ["❤️ HP", `${hp(p.hp, 0)} / ${hp(p.maxHp, 0)}`, s.hpRegen ? `+${hp(s.hpRegen, 2)} HP/s Regeneration` : "keine Regeneration"],
    ["💧 MP", `${hp(p.mp, 0)} / ${hp(p.maxMp, 0)}`, `+${hp(s.mpRegen, 2)} MP/s`],
    ["📏 Größe", `${num(s.radius)} px Radius`, `Wachstum ${num(s.growth, 2)} aus ${num(s.bodyMass, 0)} verdauten Pflanzenfasern` +
      (p.discoveredSkills.has("grow") ? (s.growActive ? " · Wachsen läuft" : " · Wachsen ausgeschaltet") : " · Wachsen noch nicht gelernt (Gras)")],
    ["🧠 Kapazität", `${num(cap.used, 0)} / ${num(cap.capacity, 0)} XP`,
      cap.overstretch > 0 ? `überdehnt um ${num(cap.overstretch, 0)} XP (Grenze ${num(cap.limit, 0)})` : `Grenze mit Überdehnung ${num(cap.limit, 0)}`],
    ["✨ Lebenserfahrung", `${num(p.lifetimeXp, 0)} XP`],
  ];

  const attributes: [string, string, string?][] = [
    ["💪 Stärke", num(s.strength, 2), `${num(s.strengthBase, 2)} aus Skills × ${num(s.sizeStrengthMult, 2)} Körpergröße · verstärkt ${scaledBy("strength")} · ${from(s.strengthSources)}`],
    ["🎯 Geschick", num(s.dexterity, 2), `Präzision: mehr schwere und kritische, weniger leichte und verfehlte Treffer; Gegner treffen seltener gut · ${from(s.dexteritySources)}`],
    ...(settled ? [] : [["💨 Geschwindigkeit", s.moveFactor > 0 ? `${num(s.speed, 1)} px/s` : "keine Bewegung",
      s.moveFactor > 0 ? `×${num(s.moveFactor, 2)} Grundtempo aus ${ALL_SKILLS.get(s.moveSkill!)?.name ?? "?"} (bester Bewegungs-Skill), wächst mit der Größe` : "noch kein Bewegungs-Skill (Regenwurm, Schnecke)"] as [string, string, string?]]),
    ["👁️ Sicht", s.vision.range > 0 ? `${num(s.vision.range, 1)} Körperradien` : "blind",
      s.vision.range > 0 ? `${s.vision.red > 0 ? `Farbe ${pct(s.vision.color)}, Rot ${pct(s.vision.red)}` : s.vision.color > 0 ? `Farbe ${pct(s.vision.color)}, ohne Rot` : "Graustufen"}` : "noch kein Seh-Skill (Regenwurm, Schnecke)"],
    ["📐 Reichweite", `${num(s.reach)} px`, "Nahkampf, Absorb, Analyze — bis zum Rand des Ziels"],
  ];

  // Angriffe: tatsächlicher Schaden je Angriffs-Skill, dazu Gift bei Treffer
  const attacks: [string, string, string?][] = [];
  for (const id of p.discoveredSkills.keys()) {
    const def = ALL_SKILLS.get(id);
    const dmg = formatPlayerSkillDamage(p, id);
    if (def && dmg) attacks.push([`${def.icon} ${def.name}`, dmg.replace(/^⚔️ /, ""), "normaler Treffer, vor Rüstung des Ziels"]);
  }
  for (const [id, inst] of p.discoveredSkills) {
    const def = ALL_SKILLS.get(id);
    if (!def || def.activation !== "passive" || inst.isEnabled === false) continue;
    if (!def.effects?.some((e) => e.effectType === "inject_venom")) continue;
    describePlayerSkillValues(p, id).forEach((line) => attacks.push([`${def.icon} ${def.name}`, line]));
  }

  const defense: [string, string, string?][] = s.defense.map((d) => {
    const parts: string[] = [];
    if (d.immune) parts.push("immun");
    if (d.flatBlock) parts.push(`Block ${hp(d.flatBlock)} HP`);
    if (d.percentReduce) parts.push(`−${pct(Math.min(d.percentReduce, MAX_PERCENT_REDUCTION))}`);
    if (d.weakness !== 1) parts.push(`×${num(d.weakness, 2)}${d.weakness > 1 ? " Schwäche" : ""}`);
    return [d.label, parts.join(" · ")];
  });
  if (s.reflect) defense.push(["↩️ Rückschlag", `${hp(s.reflect)} HP`, "an den Angreifer bei jedem erlittenen Treffer"]);

  const core: [string, string, string?][] = (["absorb", "analyze"] as const).map((a) => {
    const info = getRankInfo(p.coreAbilities[a], getLearningEffort(a));
    const level = levelFromProgress(getCoreProgress(p, a));
    return [a === "absorb" ? "💥 Absorb" : "🔍 Analyze", `${info.rankName} ${Math.floor(info.progress * 100 + 1e-7)} %`,
      `sicher erfolgreich bis Wesen-Stufe ${num(level)}`];
  });

  return [
    group("Körper", body),
    settled && meta ? settledHtml(p, meta) : "",
    group("Attribute", attributes),
    settled ? "" : group("Angriff", attacks.length ? attacks : [["—", "noch kein Angriffs-Skill"]]),
    group("Verteidigung (eingeschaltete Passiv-Skills)", defense.length ? defense : [["—", "keine"]]),
    group("Kern-Fähigkeiten", core),
  ].join("");
}

function injectStyles() {
  if (document.getElementById("statsview-styles")) return;
  const st = document.createElement("style");
  st.id = "statsview-styles";
  st.textContent = `
    .stv-group { font-family:'Cinzel',serif; font-size:.6rem; letter-spacing:2px; color:var(--accent);
      text-transform:uppercase; margin:12px 0 4px; }
    .stv-table { width:100%; border-collapse:collapse; font-size:.76rem; }
    .stv-table th { text-align:left; color:var(--muted); font-weight:400; padding:4px 10px 4px 0; white-space:nowrap; vertical-align:top; }
    .stv-table td { padding:4px 0; color:var(--text); }
    .stv-table td small { display:block; font-size:.64rem; color:var(--muted); }
    .stv-table tr + tr { border-top:1px solid #141a28; }
  `;
  document.head.appendChild(st);
}

/** Zeichnet den Werte-Tab neu (beim Öffnen des Tabs aufrufen). */
export function renderStatsView(root: HTMLElement): void {
  injectStyles();
  const state = (window as any).gameState as GameState | undefined;
  const p = state?.player;
  root.innerHTML = p ? statsHtml(p, state?.conscious) : `<p class="empty-hint">Kein Spielstand.</p>`;
}

// Stand: 15. November 2026 — niedergelassen: Tätigkeit, Quellen, Ertrag pro Stunde (GDD-10 Schritt 6); Erstfassung 1. November 2026
