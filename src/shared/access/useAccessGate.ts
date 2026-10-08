import { ref } from 'vue';
import { currentPerson } from './access.api';
import { evaluateRule } from './evaluate';
import type { AccessRule } from './rules';

export type AccessPerson = {
    id: number;
    firstName: string;
    lastName: string;
};

export type AccessStatus =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'config-missing' }
    | { phase: 'allowed'; person: AccessPerson; matchedRoleId?: number }
    | { phase: 'denied' }
    | { phase: 'error'; message: string };

/**
 * Drives US-1, generalized per ADR-008: one composable instance per view,
 * each checking its own rule. A null rule means the extension is not
 * configured yet, which is a distinct state from "denied" (US-2 first run).
 */
export function useAccessGate() {
    const status = ref<AccessStatus>({ phase: 'idle' });

    async function check(rule: AccessRule | null | undefined): Promise<void> {
        if (rule == null) {
            status.value = { phase: 'config-missing' };
            return;
        }
        status.value = { phase: 'loading' };
        try {
            const me = await currentPerson();
            const outcome = await evaluateRule(rule, me.id);

            if (outcome.status === 'allowed') {
                status.value = {
                    phase: 'allowed',
                    person: {
                        id: me.id,
                        firstName: me.firstName ?? '',
                        lastName: me.lastName ?? '',
                    },
                    matchedRoleId: outcome.matchedRoleId,
                };
            } else if (outcome.status === 'denied') {
                status.value = { phase: 'denied' };
            } else {
                status.value = {
                    phase: 'error',
                    message: outcome.httpStatus
                        ? `Der Gate-Check konnte nicht durchgeführt werden (HTTP ${outcome.httpStatus}).`
                        : 'Der Gate-Check konnte nicht durchgeführt werden.',
                };
            }
        } catch (e) {
            status.value = {
                phase: 'error',
                message: e instanceof Error ? e.message : 'Unbekannter Fehler beim Gate-Check.',
            };
        }
    }

    return { status, check };
}
