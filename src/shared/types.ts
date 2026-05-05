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
    leaderClass: LeaderClass;
};

/** A single organigram node — what each card on the dashboard renders from. */
export type OrgNode = {
    groupId: number;
    name: string;
    /** Members with isLeader=true on this group, with their role class for splitting in the UI. */
    leaders: Leader[];
    /** Count used for the stat tile. Semantics differ by level: Hauptstamm = total leaders across all levels (own + Teilstamm own + Team); Teilstamm = sum of Team leaders (label says "Teamleiter"); Team = team's own leaders. */
    leaderCount: number;
    memberCount: number;
    children: OrgNode[];
    /** Set when this node failed to load — drives the "?" rendering of US-5. */
    error?: 'fetch-failed' | 'forbidden';
};
