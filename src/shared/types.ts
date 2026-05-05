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
};

/**
 * Discriminates the two leader buckets on the Hauptstamm hero card.
 * `primary` matches role.name === "Leiter" (Hauptstammleiter / Hauptstammwart);
 * `coLeader` matches role.name === "Co-Leiter" (Stammleiter / Stammwart / Stammhelfer).
 * Anything else with isLeader=true falls into `primary` so it isn't lost.
 */
export type LeaderClass = 'primary' | 'coLeader';

export type Leader = {
    personId: number;
    fullName: string;
    initials: string;
    /** Profile picture URL from member.person.imageUrl, or null if the person has none. */
    imageUrl: string | null;
    leaderClass: LeaderClass;
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
    /** Members of THIS group with isLeader=true. Carries the role class so the Hauptstamm hero can split into Leiter / Co-Leiter pills. */
    leaders: Leader[];
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
    children: OrgNode[];
    /** Set when this node failed to load — drives the "?" rendering of US-5. */
    error?: 'fetch-failed' | 'forbidden';
};
