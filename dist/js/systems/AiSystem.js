// ============================================================
// AI SYSTEM
// Absorb & Evolve — Entity-Verhalten, Aggro, Bewegung
//
// Zuständig für:
//   - Aggro-Erkennung (Player-Distanz vs. aggroRadius)
//   - Gewünschte Bewegungsvelocity berechnen (Chase / Flee / Idle)
//   - Angriffs-Trigger wenn in Reichweite + Cooldown abgelaufen
//
// Gibt AiFrame zurück — GameScene setzt die Phaser-Velocities.
// Keine Phaser-Abhängigkeit. Kein Rendering.
//
// PERFORMANCE-STRATEGIE:
//   - Squared distances (kein sqrt in der hot loop)
//   - Skip für Entities > MAX_AI_DIST px vom Spieler
//   - AI-Update nur alle AI_TICK_MS ms pro Entity (Throttle)
//     gespeichert in instance._aiLastCalcAt (privates Feld)
// ============================================================
// -----------------------------------------------------------
// Konstanten
// -----------------------------------------------------------
// Entities weiter weg als diese Distanz bekommen keine AI-Berechnung
const MAX_AI_DIST_SQ = 500 * 500; // 500px, als Quadrat
// Aggro-Verlust wenn Entity zu weit weg ist (Hysterese: 2.5× aggroRadius)
const AGGRO_LOSS_FACTOR = 2.5;
// Mindest-Update-Intervall pro Entity (ms)
const AI_TICK_MS = 100;
// Chase-Stop-Distanz: Entity hält an wenn sie näher als attackRange × CHASE_STOP_FACTOR ist.
// Faktor 0.5 → stoppt mittig in der Angriffsreichweite, verhindert Durchlaufen.
const CHASE_STOP_FACTOR = 0.5;
// -----------------------------------------------------------
// Haupt-Funktion: AI für eine Entity berechnen
//
// Gibt AiFrame zurück mit gewünschter Velocity (vx, vy)
// und Flags für Angriff / Aggro-Änderung.
//
// Aufruf aus GameScene — einmal pro Entity pro Frame.
// Die Throttle-Logik darin sorgt dafür, dass teure Berechnungen
// nicht jeden Frame stattfinden.
// -----------------------------------------------------------
export function calcEntityAi(def, instance, playerX, playerY, now) {
    // Entities ohne Kampfwerte (Pflanzen, Mineralien) bekommen keine AI
    if (!def.damage || def.behavior === "passive") {
        return idleFrame();
    }
    // Distance check (squared — kein sqrt)
    const dxRaw = playerX - instance.x;
    const dyRaw = playerY - instance.y;
    const distSq = dxRaw * dxRaw + dyRaw * dyRaw;
    // Zu weit weg → keine AI-Berechnung
    if (distSq > MAX_AI_DIST_SQ) {
        if (instance.isAggro) {
            return { ...idleFrame(), lostAggro: true };
        }
        return idleFrame();
    }
    // Throttle — AI nur alle AI_TICK_MS berechnen
    const lastCalc = instance._aiLastCalcAt ?? 0;
    if (now - lastCalc < AI_TICK_MS) {
        // Werte aus dem letzten Frame wiederverwenden
        return {
            vx: instance._aiLastVx ?? 0,
            vy: instance._aiLastVy ?? 0,
            wantToAttack: false,
            becameAggro: false,
            lostAggro: false,
        };
    }
    instance._aiLastCalcAt = now;
    const dist = Math.sqrt(distSq); // sqrt nur 1× nach dem Throttle
    // --- Aggro-Check ---
    const aggroRadius = def.aggroRadius ?? 120;
    const aggroLossRadius = aggroRadius * AGGRO_LOSS_FACTOR;
    let becameAggro = false;
    let lostAggro = false;
    if (!instance.isAggro) {
        if (dist <= aggroRadius && shouldAggro(def)) {
            instance.isAggro = true;
            becameAggro = true;
        }
    }
    else {
        if (dist > aggroLossRadius) {
            instance.isAggro = false;
            lostAggro = true;
        }
    }
    // --- Bewegung ---
    let vx = 0;
    let vy = 0;
    if (instance.isAggro && instance.isAlive) {
        const speed = def.speed ?? 60;
        const stopDist = (def.attackRangePx ?? 60) * CHASE_STOP_FACTOR;
        if (distSq > stopDist * stopDist) {
            // Normierter Richtungsvektor × Speed
            vx = (dxRaw / dist) * speed;
            vy = (dyRaw / dist) * speed;
        }
        // Innerhalb des Stop-Radius: Entity bleibt stehen (greift aber an)
    }
    // Gecachte Velocity für Throttle-Frames
    instance._aiLastVx = vx;
    instance._aiLastVy = vy;
    // --- Angriffs-Check ---
    const attackRange = def.attackRangePx ?? 60;
    const inRange = dist <= attackRange;
    const cooldownDone = instance.attackCooldownRemaining <= 0;
    const wantToAttack = instance.isAggro && inRange && cooldownDone;
    return { vx, vy, wantToAttack, becameAggro, lostAggro };
}
// -----------------------------------------------------------
// Angriffs-Cooldown ticken (im Game Loop aufrufen)
// delta in ms
// -----------------------------------------------------------
export function tickAttackCooldown(instance, deltaMs) {
    if (instance.attackCooldownRemaining > 0) {
        instance.attackCooldownRemaining = Math.max(0, instance.attackCooldownRemaining - deltaMs);
    }
}
// -----------------------------------------------------------
// Cooldown nach einem Angriff setzen
// -----------------------------------------------------------
export function setAttackCooldown(instance, def) {
    instance.attackCooldownRemaining = def.attackCooldownMs ?? 1500;
}
// -----------------------------------------------------------
// Aggro-Reset — z.B. nach Entity-Respawn
// -----------------------------------------------------------
export function resetAi(instance) {
    instance.isAggro = false;
    instance.attackCooldownRemaining = 0;
    delete instance._aiLastCalcAt;
    delete instance._aiLastVx;
    delete instance._aiLastVy;
}
// -----------------------------------------------------------
// Hilfsfunktionen
// -----------------------------------------------------------
function idleFrame() {
    return { vx: 0, vy: 0, wantToAttack: false, becameAggro: false, lostAggro: false };
}
// Greift die Entity überhaupt an?
// defensive: nur bei isAggro (wird durch Absorb-Fehlschlag gesetzt)
// aggressive / territorial: greift aktiv an
function shouldAggro(def) {
    return def.behavior === "aggressive" || def.behavior === "territorial";
}
//# sourceMappingURL=AiSystem.js.map