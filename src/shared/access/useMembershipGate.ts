import { ref } from 'vue';
import { ct, statusOf } from '@/shared/api';
import { COPY } from '@/shared/copy';

export type GateStatus =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'allowed' }
    | { phase: 'denied' }
    | { phase: 'error'; message: string };

/**
 * The one gate for the whole extension (ADR-014): membership in the
 * configured Hauptstamm group. Who may open the extension at all is the
 * ChurchTools admin's call, through the custom module's `view` permission;
 * this is the second, cheap layer, and the group is the data root regardless.
 *
 * Fails closed, and says so: only a 404 from
 * `GET /groups/{id}/members/{personId}` denies (recon: 200 member, 404 not).
 * Every other failure — 403, 5xx, timeout, network — is an error, so the user
 * is told the check could not be made instead of being quietly turned away.
 */
export function useMembershipGate() {
    const status = ref<GateStatus>({ phase: 'idle' });

    async function check(groupId: number | null): Promise<void> {
        // Nothing configured: there is nothing to check against, and the
        // shell shows the setup form instead (shared/settings.ts).
        if (groupId === null) {
            status.value = { phase: 'idle' };
            return;
        }
        status.value = { phase: 'loading' };
        try {
            const me = await ct.get<{ id: number }>('/whoami');
            await ct.get(`/groups/${groupId}/members/${me.id}`);
            status.value = { phase: 'allowed' };
        } catch (e) {
            const httpStatus = statusOf(e);
            status.value =
                httpStatus === 404
                    ? { phase: 'denied' }
                    : { phase: 'error', message: COPY.gateCheckFailed(httpStatus) };
        }
    }

    return { status, check };
}
