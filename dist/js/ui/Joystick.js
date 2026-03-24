// ============================================================
// JOYSTICK — Virtual on-screen joystick
//
// Selbst-enthaltendes UI-Modul:
//   - erstellt die DOM-Elemente
//   - injiziert eigene CSS-Styles
//   - verwaltet den Touch-Zustand
//   - gibt ein reaktives State-Objekt zurück
//
// Keine Phaser-Abhängigkeit. Kein Zugriff auf GameState.
// ============================================================
// Maximaler Ausschlag des Thumbs in Pixeln
const THUMB_RADIUS = 44;
// ────────────────────────────────────────────────────────────
// Styles — einmalig in <head> injiziert
// ────────────────────────────────────────────────────────────
const STYLE_ID = "joystick-ui-styles";
function injectStyles() {
    if (document.getElementById(STYLE_ID))
        return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
    #joystickZone {
      position: absolute;
      left: 18px;
      bottom: 18px;
      width: 136px;
      height: 136px;
      border-radius: 50%;
      pointer-events: all;
    }
    #joystickBase {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(74, 240, 200, 0.07);
      border: 2px solid rgba(74, 240, 200, 0.22);
    }
    #joystickThumb {
      position: absolute;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #90ffcc, #40e890);
      border: 2px solid rgba(255, 255, 255, 0.25);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 14px rgba(64, 232, 144, 0.4);
      transition: box-shadow 0.1s;
    }
    #joystickZone:active #joystickThumb,
    #joystickZone.active #joystickThumb {
      box-shadow: 0 0 22px rgba(64, 232, 144, 0.7);
    }
  `;
    document.head.appendChild(el);
}
// ────────────────────────────────────────────────────────────
// DOM-Aufbau
// ────────────────────────────────────────────────────────────
function buildElements(container) {
    const zone = document.createElement("div");
    zone.id = "joystickZone";
    const base = document.createElement("div");
    base.id = "joystickBase";
    const thumb = document.createElement("div");
    thumb.id = "joystickThumb";
    zone.appendChild(base);
    zone.appendChild(thumb);
    container.appendChild(zone);
    return { zone, thumb };
}
// ────────────────────────────────────────────────────────────
// Touch-Logik
// ────────────────────────────────────────────────────────────
function attachTouchHandlers(zone, thumb, state) {
    const JR = THUMB_RADIUS;
    const applyTouch = (touch) => {
        const rawDx = touch.clientX - state._cx;
        const rawDy = touch.clientY - state._cy;
        const len = Math.hypot(rawDx, rawDy);
        const capped = Math.min(len, JR);
        const angle = Math.atan2(rawDy, rawDx);
        state.dx = (Math.cos(angle) * capped) / JR;
        state.dy = (Math.sin(angle) * capped) / JR;
        thumb.style.transform = `translate(
      calc(-50% + ${Math.cos(angle) * capped}px),
      calc(-50% + ${Math.sin(angle) * capped}px)
    )`;
    };
    const reset = () => {
        state.active = false;
        state._id = -1;
        state.dx = 0;
        state.dy = 0;
        thumb.style.transform = "translate(-50%, -50%)";
        zone.classList.remove("active");
    };
    zone.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (state.active)
            return;
        const t = e.changedTouches[0];
        const rect = zone.getBoundingClientRect();
        state.active = true;
        state._id = t.identifier;
        state._cx = rect.left + rect.width / 2;
        state._cy = rect.top + rect.height / 2;
        state.dx = 0;
        state.dy = 0;
        zone.classList.add("active");
        applyTouch(t);
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (!state.active)
            return;
        for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === state._id)
                applyTouch(t);
        }
    }, { passive: false });
    const onEnd = (e) => {
        for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === state._id)
                reset();
        }
    };
    zone.addEventListener("touchend", onEnd, { passive: false });
    zone.addEventListener("touchcancel", onEnd, { passive: false });
}
// ────────────────────────────────────────────────────────────
// Öffentliche API
// ────────────────────────────────────────────────────────────
/**
 * Erstellt einen virtuellen Joystick und hängt ihn an `container`.
 * Gibt ein State-Objekt zurück, das live aktualisiert wird.
 *
 * @param container  HTML-Element, in das der Joystick eingefügt wird
 *                   (typischerweise #touchControls)
 */
export function createJoystick(container) {
    injectStyles();
    const { zone, thumb } = buildElements(container);
    const state = {
        active: false,
        dx: 0,
        dy: 0,
        _id: -1,
        _cx: 0,
        _cy: 0,
    };
    attachTouchHandlers(zone, thumb, state);
    return state;
}
//# sourceMappingURL=Joystick.js.map