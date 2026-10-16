/**
 * The parts of ChurchTools' API responses this extension reads, written out
 * by hand. Partial on purpose: every field here is one some code reads, so
 * the list doubles as the inventory of what the extension depends on.
 *
 * Optional wherever the live API has been seen to leave a field out, and
 * `unknown` where it has been seen to disagree with its own spec — the
 * readers of those fields check the shape themselves.
 */

/** A role as a group's `roles` include lists it. */
export type GroupRole = {
    /** Unique installation-wide — what every configured role id refers to. */
    groupTypeRoleId: number;
    name?: string;
    sortKey?: number;
    /** `'leader'` for roles ChurchTools calls leadership. */
    type?: string;
    /** Deprecated in the spec, still delivered; read alongside `type`. */
    isLeader?: boolean;
    isHidden?: boolean;
    isActive?: boolean;
};

export type Group = {
    id: number;
    name: string;
    information?: { groupTypeId?: number };
    /** Present when requested with `include[]=roles`. */
    roles?: GroupRole[];
};

export type GroupMember = {
    /** The membership id — what the log's `Gruppenmitgliedschaft[<id>]` refers to. */
    id?: number;
    groupTypeRoleId: number;
    person?: {
        title?: string;
        /** The person id, as a numeric string — see `personIdOf`. */
        domainIdentifier?: string;
        domainAttributes?: { firstName?: string; lastName?: string };
        /** ChurchTools' own link to the person (ADR-013). */
        frontendUrl?: string | null;
        imageUrl?: string | null;
        initials?: string;
    };
    /** An array in the spec, an object on the live API — see `personFieldsOf`. */
    personFields?: unknown;
    /** `{ name, value }[]` on the live API, an object in the spec. */
    fields?: unknown;
};

export type CustomModule = {
    id: number;
    name: string;
    shorty: string;
    description?: string;
    inMenu: boolean;
    sortKey: number;
};

export type CustomModuleCreate = Omit<CustomModule, 'id'>;

export type CustomModuleDataCategoryCreate = {
    customModuleId: number;
    /** The stored document, as a JSON string. */
    data?: string;
    description: string;
    name: string;
    shorty: string;
};

export type CustomModuleDataCategory = CustomModuleDataCategoryCreate & { id: number };
