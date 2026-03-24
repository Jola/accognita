export interface SkillBarState {
    /** Aktuell belegte Slots (null = leer) */
    slots: (string | null)[];
    /** Skill einem Slot zuweisen (null = leeren) */
    assignSlot(slotIndex: number, skillId: string | null): void;
    /** Anzeige sofort aktualisieren */
    update(): void;
    /** SkillBar entfernen und Interval stoppen */
    destroy(): void;
}
export declare function createSkillBar(container: HTMLElement, onOpenMenu: () => void): SkillBarState;
//# sourceMappingURL=SkillBar.d.ts.map