import { computed, ref, watch } from 'vue';
import { listChildren, listGroupTypes, listGroups, listRoles, scanScope } from './admin.api';
import { myMembershipIn } from '@/shared/groups.api';
import type { ChildGroup, GroupTypeRef, PickableRole, ScopeScan } from './admin.api';
import {
    applyTickedRoles,
    countsAsMitarbeiter,
    childCandidates,
    childTypeCounts,
    otherCandidates,
    personsInScope,
    personsWithRole,
    rolesInScope,
    stammTypeIds,
    teamsInScope,
    tickedRoleIds,
} from './scope';
import { useAdminSettings } from './useAdminSettings';
import { COPY } from '@/shared/copy';
import {
    EMPTY_SETTINGS,
    hasAnySetting,
    isDashboardConfigured,
    saveAccessProblem,
} from '@/shared/settings';
import type { SaveAccessProblem, Settings } from '@/shared/settings';

const ACCESS_PROBLEM_TEXT: Record<SaveAccessProblem, string> = {
    noneChosen: COPY.adminAccessNoneChosen,
    unverifiable: COPY.adminAccessUnverifiable,
    checking: COPY.adminAccessChecking,
    wouldLockOut: COPY.adminAccessWouldLockOut,
};
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
    /** The Hauptstamm's children could not be read — not the same as "it has none". */
    const childrenFailed = ref(false);
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
            ? personsInScope(scan.value, draft.value, countsAsMitarbeiter(roles.value, draft.value))
            : 0,
    }));

    const scopedRoles = computed(() =>
        rolesInScope(
            roles.value,
            [...teilstammTypes.value, ...draft.value.teamGroupTypeIds],
            groupTypes.value,
        ),
    );
    /** The roles counted as Mitarbeiter, as one list the admin ticks (`applyTickedRoles`). */
    const mitarbeiterRoleIds = computed<number[]>({
        get: () => tickedRoleIds(scopedRoles.value, draft.value),
        set: (ids) => {
            draft.value = {
                ...draft.value,
                ...applyTickedRoles(scopedRoles.value, ids, draft.value),
            };
        },
    });

    /**
     * Positions a Teilstamm card can show as vacant: the counted leadership
     * roles of the Teilstamm group types — the rows those cards list. A team's
     * "Co-Leiter" is never a row on a Teilstamm card.
     */
    const vacancyRoles = computed(() => {
        const excluded = new Set(draft.value.excludedLeaderRoleIds);
        return rolesInScope(roles.value, teilstammTypes.value, groupTypes.value).filter(
            (r) => r.isLeadership && !excluded.has(r.id),
        );
    });

    /**
     * A group is a Teilstamm or a Sammelgruppe, never both: it would count
     * its members once as a level and once as leaders without a team. Ticking
     * it in one list takes it out of the other.
     */
    const teilstammModel = computed<number[]>({
        get: () => draft.value.teilstammIds,
        set: (ids) => {
            const picked = new Set(ids);
            draft.value = {
                ...draft.value,
                teilstammIds: ids,
                collectionGroupIds: draft.value.collectionGroupIds.filter((id) => !picked.has(id)),
            };
        },
    });
    const collectionModel = computed<number[]>({
        get: () => draft.value.collectionGroupIds,
        set: (ids) => {
            const picked = new Set(ids);
            draft.value = {
                ...draft.value,
                collectionGroupIds: ids,
                teilstammIds: draft.value.teilstammIds.filter((id) => !picked.has(id)),
            };
        },
    });

    /**
     * Sammelgruppen on offer: the Hauptstamm's children of any type — such a
     * group usually hangs there — plus whatever is already chosen elsewhere.
     */
    const collectionCandidates = computed(() => {
        const own = draft.value.gateGroupId;
        const children = hauptstammChildren.value
            .filter((c) => c.id !== own)
            .map((c) => ({ id: c.id, name: c.title }));
        const listed = new Set(children.map((c) => c.id));
        const chosenElsewhere = draft.value.collectionGroupIds
            .filter((id) => !listed.has(id))
            .map((id) => ({
                id,
                name: groups.value.find((g) => g.id === id)?.name ?? COPY.groupFallbackName(id),
            }));
        return [...children, ...chosenElsewhere].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    });

    /** The roles of the Hauptstamm group's type — what may be allowed to configure. */
    const hauptstammRoles = computed(() => {
        const type = hauptstamm.value?.information?.groupTypeId;
        if (type !== undefined) return rolesInScope(roles.value, [type], groupTypes.value);
        // A group without a type on record: offer the roles its members
        // actually hold, so the setup can still be saved.
        const held = new Set(hauptstammMembers.value.values());
        return rolesInScope(
            roles.value.filter((r) => held.has(r.id)),
            [...new Set(roles.value.filter((r) => held.has(r.id)).map((r) => r.groupTypeId ?? -1))],
            groupTypes.value,
        );
    });

    /** personId → role in the chosen Hauptstamm group, from the scan. */
    const hauptstammMembers = computed(
        () =>
            (draft.value.gateGroupId !== null &&
                scan.value?.membersByGroup.get(draft.value.gateGroupId)) ||
            new Map<number, number>(),
    );

    /** How many members of the Hauptstamm group hold a role — who could configure. */
    function hauptstammHolders(roleId: number): number {
        let count = 0;
        for (const held of hauptstammMembers.value.values()) if (held === roleId) count += 1;
        return count;
    }

    /**
     * The viewer's own role in the chosen Hauptstamm group: null when they are
     * not a member, undefined while it is being read. Saving needs it — a
     * selection that leaves out the person saving locks them out at once.
     */
    const myRoleId = ref<number | null | undefined>(undefined);
    const myRoleFailed = ref(false);
    let myRoleSequence = 0;
    async function refreshMyRole(groupId: number | null) {
        const mine = ++myRoleSequence;
        myRoleId.value = undefined;
        myRoleFailed.value = false;
        if (groupId === null) return;
        try {
            const role = (await myMembershipIn(groupId))?.roleId ?? null;
            if (mine === myRoleSequence) myRoleId.value = role;
        } catch (e) {
            console.error('[rr-dashboard] own role unavailable:', e);
            if (mine === myRoleSequence) myRoleFailed.value = true;
        }
    }

    /** Why saving is not possible yet, or null. */
    const accessProblem = computed<string | null>(() => {
        const problem = saveAccessProblem(draft.value, myRoleId.value, myRoleFailed.value);
        return problem === null ? null : ACCESS_PROBLEM_TEXT[problem];
    });

    /** A started or older setup was found — the form says it took it over. */
    const takenOver = ref(false);

    function roleHolders(roleId: number): number {
        return scan.value === null ? 0 : personsWithRole(scan.value, roleId);
    }

    const canSave = computed(
        () => isDashboardConfigured(draft.value) && accessProblem.value === null && !saving.value,
    );

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
            // The old Hauptstamm's children and its group type's roles.
            collectionGroupIds: [],
            adminRoleIds: [],
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
        childrenFailed.value = false;
        if (id === null) return;
        try {
            const children = await listChildren(id);
            if (mine === childrenSequence) hauptstammChildren.value = children;
        } catch (e) {
            console.error('[rr-dashboard] children unavailable:', e);
            if (mine === childrenSequence) childrenFailed.value = true;
        }
    }

    async function runScan() {
        const mine = ++scanSequence;
        if (draft.value.gateGroupId === null || draft.value.teilstammIds.length === 0) {
            // Also ends a scan still in flight for the previous selection,
            // whose own `finally` no longer owns the flag.
            scan.value = null;
            scanning.value = false;
            return;
        }
        scanning.value = true;
        try {
            const result = await scanScope(
                draft.value.gateGroupId,
                draft.value.teilstammIds,
                draft.value.collectionGroupIds,
            );
            if (mine === scanSequence) scan.value = result;
        } catch (e) {
            // No counts at all rather than the previous selection's.
            console.error('[rr-dashboard] admin scan failed:', e);
            if (mine === scanSequence) scan.value = null;
        } finally {
            if (mine === scanSequence) scanning.value = false;
        }
    }

    watch(() => draft.value.gateGroupId, refreshChildren);
    watch(
        () => `${draft.value.teilstammIds.join(',')}|${draft.value.collectionGroupIds.join(',')}`,
        runScan,
    );
    watch(() => draft.value.gateGroupId, refreshMyRole);

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
            takenOver.value = hasAnySetting(settings.value);
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
        childrenFailed,
        typeCounts,
        preview,
        scopedRoles,
        teilstammModel,
        collectionModel,
        collectionCandidates,
        hauptstammRoles,
        hauptstammHolders,
        accessProblem,
        mitarbeiterRoleIds,
        vacancyRoles,
        takenOver,
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
