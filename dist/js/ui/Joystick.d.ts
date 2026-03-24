/** Bewegungsvektor des Joysticks, normiert auf [-1, 1]. */
export interface JoystickState {
    active: boolean;
    /** Normierter Ausschlag horizontal (–1 = links, +1 = rechts) */
    dx: number;
    /** Normierter Ausschlag vertikal  (–1 = oben,  +1 = unten)  */
    dy: number;
    /** Interne Touch-ID für Multi-Touch-Tracking */
    _id: number;
    /** Mittelpunkt des Joysticks (client-Koordinaten) */
    _cx: number;
    _cy: number;
}
/**
 * Erstellt einen virtuellen Joystick und hängt ihn an `container`.
 * Gibt ein State-Objekt zurück, das live aktualisiert wird.
 *
 * @param container  HTML-Element, in das der Joystick eingefügt wird
 *                   (typischerweise #touchControls)
 */
export declare function createJoystick(container: HTMLElement): JoystickState;
//# sourceMappingURL=Joystick.d.ts.map