import { computed, ref, watch } from 'vue';
import { listChildren, listGroupTypes, listGroups, listRoles, scanScope } from './admin.api';
import type { ChildGroup, GroupTypeRef, PickableRole, ScopeScan } from './admin.api';
import {
    childCandidates,
    childTypeCounts,
    otherCandidates,
    personsInScope,
    personsWithRole,
    rolesInScope,
    stammTypeIds,
    teamsInScope,
} from './scope';
import { useAdminSettings } from './useAdminSettings';
import { COPY } from '@/shared/copy';
import { EMPTY_SETTINGS, isDashboardConfigured } from '@/shared/settings';
import type { Settings } from '@/shared/settings';
import type { Group } from '@/shared/types';

/**
 * Everything the configuration screen knows and does: the installation's
 * groups, types and roles, the edited draft, the scan that turns it into
 * counts, and the save. The component only renders it.
 */
export function useAdminForm() {
    const { settings, loadFailed, load, saving, saveError, save } = useAdminSettings();

    /** The edited copy. Saved only on demand, so a half-made change cannot leak. */
    const draft = ref<Settings>({ ...EMPTY_SETTINGS, fees: { ...EMPTY_SETTINGS.fees } });

    const groups = ref<Group[]>([]);
    const groupTypes = ref<GroupTypeRef[]>([]);
    const roles = ref<PickableRole[]>([]);
    const loadError = ref<string | null>(null);
    const booting = ref(true);
    const savedJustNow = ref(false);

    const hauptstammChildren = ref<ChildGroup[]>([]);
    const scan = ref<ScopeScan | null>(null);
    const scanning = ref(false);

    const hauptstamm = computed(() => groups.value.find((g) => g.id === draft.value.gateGroupId));
    const teilstammTypes = computed(() =>
        stammTypeIds(draft.value.stammGroupTypeIds, hauptstamm.value),
    );

    const candidates = computed(() => ({
        children: childCandidates(hauptstammChildren.value, teilstammTypes.value),
        others: otherCandidates(groups.value, hauptstammChildren.value, teilstammTypes.value),
    }));

    const typeCounts = computed(() =>
        childTypeCounts(scan.value?.children ?? [], groupTypes.value),
    );

    const preview = computed(() => ({
        teilstaemme: draft.value.teilstammIds.length,
        teams: scan.value ? teamsInScope(scan.value, draft.value.teamGroupTypeIds).length : 0,
        persons: scan.value
            ? personsInScope(
                  scan.value,
                  draft.value.gateGroupId,
                  draft.value.teilstammIds,
                  draft.value.teamGroupTypeIds,
              )
            : 0,
    }));

    const scopedRoles = computed(() =>
        rolesInScope(
            roles.value,
            [...teilstammTypes.value, ...draft.value.teamGroupTypeIds],
            groupTypes.value,
        ),
    );
    /** Roles ChurchTools itself calls leadership — they always count. */
    const leadershipRoles = computed(() => scopedRoles.value.filter((r) => r.isLeadership));
    /** Participant roles the Stamm may additionally treat as Mitarbeiter. */
    const participantRoles = computed(() => scopedRoles.value.filter((r) => !r.isLeadership));

    function roleHolders(roleId: number): number {
        return scan.value === null ? 0 : personsWithRole(scan.value, roleId);
    }

    const canSave = computed(() => isDashboardConfigured(draft.value) && !saving.value);

    function selectHauptstamm(id: number) {
        if (draft.value.gateGroupId === id) return;
        // Every dependent pick referred to the previous Hauptstamm's
        // structure — including the type filter, which otherwise keeps the
        // old Hauptstamm's type and quietly narrows the Teilstamm list to the
        // wrong set.
        draft.value = {
            ...draft.value,
            gateGroupId: id,
            teilstammIds: [],
            teamGroupTypeIds: [],
            stammGroupTypeIds: [],
        };
    }

    /**
     * Sequence numbers for the two reads the draft triggers. A watcher fires
     * on every change and a scan is some thirty requests, so a slower earlier
     * run could land after a newer one and leave the screen describing a
     * selection the admin has moved on from — a stale "0 Personen" being
     * exactly the kind of wrong number this screen exists to prevent.
     */
    let childrenSequence = 0;
    let scanSequence = 0;

    async function refreshChildren(id: number | null) {
        const mine = ++childrenSequence;
        hauptstammChildren.value = [];
        if (id === null) return;
        try {
            const children = await listChildren(id);
            if (mine === childrenSequence) hauptstammChildren.value = children;
        } catch (e) {
            console.error('[rr-dashboard] children unavailable:', e);
        }
    }

    async function runScan() {
        const mine = ++scanSequence;
        if (draft.value.gateGroupId === null || draft.value.teilstammIds.length === 0) {
            scan.value = null;
            return;
        }
        scanning.value = true;
        try {
            const result = await scanScope(draft.value.gateGroupId, draft.value.teilstammIds);
            if (mine === scanSequence) scan.value = result;
        } finally {
            if (mine === scanSequence) scanning.value = false;
        }
    }

    watch(() => draft.value.gateGroupId, refreshChildren);
    watch(() => draft.value.teilstammIds.join(','), runScan);

    async function boot() {
        try {
            const [g, t, r] = await Promise.all([listGroups(), listGroupTypes(), listRoles()]);
            groups.value = g;
            groupTypes.value = t;
            roles.value = r;
            await load();
            if (loadFailed.value) {
                // Do not seed an empty draft from a failed read: saving it
                // would overwrite a configuration that is merely unreachable.
                loadError.value = COPY.configUnreadable;
                return;
            }
            // Seeding the draft triggers the watchers above, which load the
            // children and run the scan.
            draft.value = { ...settings.value, fees: { ...settings.value.fees } };
        } catch (e) {
            loadError.value = e instanceof Error ? e.message : COPY.adminLoadError;
        } finally {
            booting.value = false;
        }
    }

    /** Resolves true once saved; a failure leaves its message in `saveError`. */
    async function submit(): Promise<boolean> {
        savedJustNow.value = false;
        try {
            // Persist the type filter that was only derived until now, so the
            // next admin sees what is in force rather than a value that moves
            // with the Hauptstamm's own type.
            await save({ ...draft.value, stammGroupTypeIds: teilstammTypes.value });
            savedJustNow.value = true;
            return true;
        } catch {
            return false;
        }
    }

    return {
        draft,
        groups,
        hauptstamm,
        candidates,
        typeCounts,
        preview,
        leadershipRoles,
        participantRoles,
        roleHolders,
        scan,
        scanning,
        booting,
        loadError,
        saving,
        saveError,
        savedJustNow,
        canSave,
        selectHauptstamm,
        boot,
        submit,
    };
}
