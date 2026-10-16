import type { Scene, NarrativePosition } from '../../db/schema';
import { db } from '../../db/database';

/**
 * Resolves the canonical narrative sequence number for a scene.
 * Order of precedence:
 * 1. scene.narrativePosition?.sequence (author-editable chronological sequence)
 * 2. scene.timelineStart (if numeric world-time epoch)
 * 3. scene.sortOrder (fallback to manuscript sort order)
 */
export function getSceneNarrativeSequence(scene: Partial<Scene>): number {
    if (scene.narrativePosition?.sequence != null && !isNaN(Number(scene.narrativePosition.sequence))) {
        return Number(scene.narrativePosition.sequence);
    }
    if (scene.timelineStart != null && !isNaN(Number(scene.timelineStart))) {
        return Number(scene.timelineStart);
    }
    if (scene.sortOrder != null && !isNaN(Number(scene.sortOrder))) {
        return Number(scene.sortOrder);
    }
    return 0;
}

/**
 * Resolves the sequence number for a NarrativePosition constraint (validFrom/validUntil).
 */
export async function resolvePositionSequence(pos: NarrativePosition | null | undefined): Promise<number | null> {
    if (!pos) return null;
    if (pos.sequence != null && !isNaN(Number(pos.sequence))) {
        return Number(pos.sequence);
    }
    if (pos.sceneId) {
        const scene = await db.scenes.get(pos.sceneId);
        if (scene) {
            return getSceneNarrativeSequence(scene);
        }
    }
    return null;
}

/**
 * Evaluates whether a fact with [validFrom, validUntil] bounds is active at targetSequence.
 */
export async function isNarrativePositionInRange(
    targetSequence: number,
    validFrom: NarrativePosition | null | undefined,
    validUntil: NarrativePosition | null | undefined
): Promise<boolean> {
    const fromSeq = await resolvePositionSequence(validFrom);
    if (fromSeq != null && targetSequence < fromSeq) {
        return false; // Future fact: target is earlier than validFrom
    }
    const untilSeq = await resolvePositionSequence(validUntil);
    if (untilSeq != null && targetSequence > untilSeq) {
        return false; // Expired fact: target is later than validUntil
    }
    return true;
}
