import { ref } from 'vue';
import { checkMembership, whoami } from './gate.api';

export type GatePerson = {
    id: number;
    firstName: string;
    lastName: string;
};

export type GateStatus =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'config-missing' }
    | { phase: 'allowed'; person: GatePerson }
    | { phase: 'denied' }
    | { phase: 'error'; message: string };

/**
 * Drives US-1. Given a configured Hauptstamm group ID, calls /whoami and
 * /groups/{gateId}/members/{personId} to decide whether to render the
 * dashboard, the access-denied screen, or an error screen.
 */
export function useGate() {
    const status = ref<GateStatus>({ phase: 'idle' });

    async function check(gateGroupId: number | null | undefined): Promise<void> {
        if (gateGroupId == null) {
            status.value = { phase: 'config-missing' };
            return;
        }
        status.value = { phase: 'loading' };
        try {
            const me = await whoami();
            const result = await checkMembership(gateGroupId, me.id);
            if (result.status === 'member') {
                status.value = {
                    phase: 'allowed',
                    person: {
                        id: me.id,
                        firstName: me.firstName ?? '',
                        lastName: me.lastName ?? '',
                    },
                };
            } else if (result.status === 'not-member') {
                status.value = { phase: 'denied' };
            } else {
                status.value = {
                    phase: 'error',
                    message: result.httpStatus
                        ? `Der Gate-Check konnte nicht durchgeführt werden (HTTP ${result.httpStatus}).`
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
