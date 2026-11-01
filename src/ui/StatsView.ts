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

import type { PlayerState } from "../types/GameState.js";
import { ALL_SKILLS } from "../data/skills.js";
import { MILLI, MAX_PERCENT_REDUCTION } from "../data/balance.js";
import { getCharacterStats, describePlayerSkillValues } from "../systems/StatsSystem.js";
import { formatPlayerSkillDamage, MP_REGEN_MILLI_PER_SECOND } from "../systems/CombatSystem.js";
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

function statsHtml(p: PlayerState): string {
  const s = getCharacterStats(p, getRegenerationRate(p), MP_REGEN_MILLI_PER_SECOND);
  const cap = getCapacityInfo(p);
  const from = (list: string[]) => (list.length ? `aus ${list.join(", ")}` : "noch kein Skill");

  const body: [string, string, string?][] = [
    ["❤️ HP", `${hp(p.hp, 0)} / ${hp(p.maxHp, 0)}`, s.hpRegen ? `+${hp(s.hpRegen, 2)} HP/s Regeneration` : "keine Regeneration"],
    ["💧 MP", `${hp(p.mp, 0)} / ${hp(p.maxMp, 0)}`, `+${hp(s.mpRegen, 2)} MP/s`],
    ["📏 Größe", `${num(s.radius)} px Radius`, `Wachstum ${num(s.growth, 2)}`],
    ["🧠 Kapazität", `${num(cap.used, 0)} / ${num(cap.capacity, 0)} XP`,
      cap.overstretch > 0 ? `überdehnt um ${num(cap.overstretch, 0)} XP (Grenze ${num(cap.limit, 0)})` : `Grenze mit Überdehnung ${num(cap.limit, 0)}`],
    ["✨ Lebenserfahrung", `${num(p.lifetimeXp, 0)} XP`],
  ];

  const attributes: [string, string, string?][] = [
    ["💪 Stärke", `×${num(s.strength, 2)}`, `${s.strength !== 1 ? `${s.strength > 1 ? "+" : "−"}${pct(Math.abs(s.strength - 1))} Schaden · ` : ""}${from(s.strengthSources)}`],
    ["🎯 Geschick", num(s.dexterity, 2), `bessere Treffer, Gegner treffen seltener gut · ${from(s.dexteritySources)}`],
    ["💨 Geschwindigkeit", `${num(s.speed, 0)} px/s`, "wächst mit der Größe"],
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
    group("Attribute", attributes),
    group("Angriff", attacks.length ? attacks : [["—", "noch kein Angriffs-Skill"]]),
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
  const p = (window as any).gameState?.player as PlayerState | undefined;
  root.innerHTML = p ? statsHtml(p) : `<p class="empty-hint">Kein Spielstand.</p>`;
}

// Stand: 1. November 2026 — Erstfassung
