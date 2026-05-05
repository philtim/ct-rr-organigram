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

/** A single organigram node — what each card on the dashboard renders from. */
export type OrgNode = {
    groupId: number;
    name: string;
    leaders: Array<{ personId: number; fullName: string; initials: string }>;
    leaderCount: number;
    memberCount: number;
    children: OrgNode[];
    /** Set when this node failed to load — drives the "?" rendering of US-5. */
    error?: 'fetch-failed' | 'forbidden';
};
