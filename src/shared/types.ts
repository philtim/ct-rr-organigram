/**
 * Domain-level shared types. Re-exports from ct-types where useful;
 * adds project-specific aggregates (the in-memory organigram tree).
 */
export type {
    CustomModule,
    CustomModuleCreate,
    CustomModuleDataCategory,
    CustomModuleDataCategoryCreate,
    CustomModuleDataValue,
    CustomModuleDataValueCreate,
    Group,
    GroupHierarchy,
    GroupMember,
    Person,
} from './ct-types';

/** Persisted shape of `settings` KV entry (US-2). */
export type Settings = {
    gateGroupId: number;
    /**
     * Group-IDs of the actual Teilstämme. Many Hauptstamm children are
     * operational/Maßnahme groups that should not render as Teilstamm cards;
     * the admin picks the real ones explicitly. Undefined = legacy behavior
     * (render all children) so existing installations keep working.
     */
    teilstammIds?: number[];
};

/** A leadership role as the group type defines it. */
export type LeaderRole = {
    name: string;
    sortKey: number;
};

export type Leader = {
    personId: number;
    fullName: string;
    initials: string;
    /** Profile picture URL from member.person.imageUrl, or null if the person has none. */
    imageUrl: string | null;
    /**
     * The group role's own name, verbatim from ChurchTools — "Stammleiter",
     * "Hauptstammwart", "Leiter", … The cards group and label by this instead
     * of mapping it onto fixed buckets, so an installation that renames or
     * adds roles needs no code change.
     */
    roleName: string;
    /** `role.sortKey`, so the cards can order role groups the way the group type does. */
    roleSortKey: number;
    /**
     * True for roles ChurchTools itself flags as leadership (`role.isLeader`).
     * Only these render as pills / in the leader list; the broadened
     * Mitarbeiter/Teamhelfer/Organisator roles count towards the stat tile but
     * stay out of the name lists.
     */
    isPillRole: boolean;
};

/** Slim shape for non-leader members; carries name so the duplicates panel can display it. */
export type Participant = {
    personId: number;
    fullName: string;
};

/** A single organigram node — what each card on the dashboard renders from. */
export type OrgNode = {
    groupId: number;
    name: string;
    /** Members of THIS group whose role counts as leader. Carries the role name so the cards can group by it. */
    leaders: Leader[];
    /**
     * The leadership roles this group defines (active, not hidden), in the
     * group type's own order. Lets a card show a vacant position — "Stammwart:
     * nicht besetzt" — instead of silently leaving the line out.
     */
    leaderRoles: LeaderRole[];
    /** Non-leader members of THIS group (role.isLeader=false). Carries names so the duplicates panel can list cross-team assignments. */
    participants: Participant[];
    /**
     * Display count for the leader stat tile.
     *  - Team: this team's own leader headcount.
     *  - Teilstamm: unique team leaders across this Teilstamm's teams.
     *  - Hauptstamm: unique leaders across (Hauptstamm own ∪ all team leaders).
     */
    leaderCount: number;
    /**
     * Display count for the member ("Mitglieder") stat tile.
     *  - Team: this team's own non-leader headcount.
     *  - Teilstamm: unique team participants across this Teilstamm's teams.
     *  - Hauptstamm: unique team participants across the whole tree.
     */
    memberCount: number;
    /**
     * Number of members who want the "Horizont" magazine (group member
     * checkbox field "Horizont" is set).
     *  - Team: this team's own count.
     *  - Teilstamm/Hauptstamm: sum over child teams — it is an order
     *    quantity, so double team memberships intentionally count twice.
     */
    horizontCount: number;
    children: OrgNode[];
    /** Set when this node failed to load — drives the "?" rendering of US-5. */
    error?: 'fetch-failed' | 'forbidden';
};
