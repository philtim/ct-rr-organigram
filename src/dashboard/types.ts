/** The in-memory organigram the dashboard builds and its cards render. */

/** A leadership role as the group type defines it. */
export type LeaderRole = {
    /** `groupTypeRoleId` — what `Settings.alwaysShownRoleIds` refers to. */
    id: number;
    name: string;
    sortKey: number;
};

export type Leader = {
    personId: number;
    /** `groupTypeRoleId` of the role this person holds in this group. */
    roleId: number;
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
     * True for roles ChurchTools itself flags as leadership. Only these render
     * as pills / in the leader list; roles that count as leaders only because
     * the admin added them (`Settings.extraLeaderRoleIds`) count towards the
     * stat tile but stay out of the name lists.
     */
    isPillRole: boolean;
    /** ChurchTools' own link to the person (ADR-013), when the API sent one. */
    frontendUrl?: string | null;
};

/** Slim shape for non-leader members; carries name so the duplicates panel can display it. */
export type Participant = {
    personId: number;
    fullName: string;
    /** ChurchTools' own link to the person (ADR-013), when the API sent one. */
    frontendUrl?: string | null;
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
    /** Non-leader members of THIS group. Carries names so the duplicates panel can list cross-team assignments. */
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
     * Members whose configured checkbox field (`Settings.horizontFieldName`)
     * is set — an order quantity, so:
     *  - Team: this team's own count.
     *  - Teilstamm/Hauptstamm: sum over child teams; double team memberships
     *    intentionally count twice.
     */
    horizontCount: number;
    /** This group's members carry the configured field at all — see `hasMemberField`. */
    horizontFieldSeen?: boolean;
    children: OrgNode[];
    /**
     * On the Hauptstamm only: the configured Sammelgruppen, every member a
     * leader (`Settings.collectionGroupIds`). Not a level of the organigram,
     * so not among `children`.
     */
    collections?: OrgNode[];
    /**
     * Set when this group itself could not be read — its leaders are unknown
     * and the card shows "?" in their place (US-5).
     */
    error?: 'fetch-failed';
    /** Set on a Teilstamm whose list of teams could not be read. */
    childrenFailed?: boolean;
    /**
     * True when the counts above are missing part of what they summarise — a
     * team, a Teilstamm, or this group itself. The cards then show "?" in red
     * instead of a number that would look right and be too low.
     */
    incomplete: boolean;
};
