# BATCH 6 — BACKEND AUTHORIZATION & ADMIN CONTRACT AUDIT

## AUTHORITATIVE ARCHITECTURE RECONCILIATION — 2026-09-24

This addendum is the current decision record for the ASF restructuring request. The detailed inventory below remains useful evidence, but any conflict is resolved in favor of this section.

### Decision

Do not implement the President frontend yet and do not treat the current role table as the target architecture. The current backend is a role-to-permission system. It does not currently separate membership from executive office, executive office from dashboard access, fellowship subgroup from office, permissions/capabilities from office, or Technical Head capability from a normal role.

The backend session remains the authority. The frontend `localStorage('asf_admin_role')` value must never authorize a request.

### Canonical fellowship data to preserve

The following 23 executive offices must remain representable, including offices with no dashboard: President, Vice President, General Secretary, Sisters' Coordinator, Financial Secretary, Bible Study Coordinator, Brothers' Coordinator, Prayer Coordinator, Organizing Coordinator, Evangelism/Follow-up Coordinator, Church Mission Coordinator, Public Relation Officer (PRO)/Publicity Coordinator, Assistant General Secretary, Choir Coordinator, Drama Coordinator, Academic Coordinator, Librarian, Off-Campus Coordinator, Assistant Organizing Coordinator, Assistant Off-Campus Coordinator, Akindeko Hall Coordinator, Obanla Male Coordinator, and Obanla Female Coordinator.

The canonical subgroups are exactly: Bible Study, Prayer, Drama, Organizing, Choir, Church Mission, Academic, Evangelism/Follow-up, and Publicity. No automatic office-to-subgroup mapping should be introduced.

Active normal dashboards for the current phase are President, Vice President, and Publicity Coordinator. Technical Head is an additional capability, not a replacement office and not a prerequisite office. General Secretary and Bible Study Coordinator remain executive offices even though they do not receive an active dashboard in this phase.

### Current model versus target model

| Concept | Current backend | Target foundation |
|---|---|---|
| Membership | `users`, including free-text `subgroup` and membership/account status | Preserve `users`; normalize allowed subgroup values and expose canonical member data |
| Executive office | Role names such as `President / Executive` and `General Secretary` in `roles`/`user_roles` | Dedicated office catalog plus user-office assignments |
| Fellowship subgroup | `users.subgroup` free text | Dedicated canonical subgroup value/assignment, independent of office |
| Dashboard access | Implicitly derived from permissions attached to role names | Explicit dashboard-access assignment/policy, separate from office |
| Permissions | Static `permissions.config.ts`, evaluated by role name | Preserve permission checks, then allow explicit capabilities/policies to satisfy them |
| Technical Head | `Technical Administrator` ordinary role | Dedicated additional capability that can coexist with any office or no office |

### Findings that block a safe President implementation

1. `users.subgroup` is a nullable free-text column; it cannot enforce the nine canonical subgroups or provide a reliable subgroup filter.
2. There is no executive-office table or assignment table. The role table is currently being used as both office catalog and authorization input.
3. `Technical Administrator` is a normal role. It can coexist with other roles only accidentally through multiple `user_roles` rows, not through an explicit capability model.
4. `PATCH /api/members/:id/role` accepts any existing role ID for any actor with `members.edit_role`. There is no hierarchy, assignability policy, self-escalation guard, or separate office/dashboard/capability operation.
5. `governance.approve` exists in configuration but has no route, service, persistence, request model, or audit workflow.
6. No executive handover or office-transition workflow exists.
7. Events are the existing program-like backend, but the schema and validation still include category, end time, speaker role, and image URL. The stable `/api/events` contract should be preserved until the program contract is explicitly approved.
8. System health is real but limited to API, database, Cloudinary reachability, process memory, scheduler state, and recent `system_events`; it is not a general monitoring/configuration console.

### Phase A — backend architecture foundation (required before President portal)

Implement this as a focused migration, without deleting existing roles or changing unrelated modules:

1. Add canonical `executive_offices` data containing all 23 offices, with stable IDs, display names, and active status.
2. Add `user_executive_offices` with `user_id`, `office_id`, `assigned_by`, timestamps, and a uniqueness constraint. Preserve outgoing members as users.
3. Replace free-form subgroup writes with a canonical subgroup catalog or a database check/enum for the nine approved values. Keep membership status separate.
4. Add explicit dashboard-access assignments/policy only for active dashboard offices. Do not infer a dashboard from every executive office.
5. Add a `user_capabilities` table or equivalent capability assignment with `technical_head` as the first capability. It must allow a Member, an office holder, or a dashboard holder to receive Technical Head independently.
6. Introduce one backend authorization resolver that combines session account status, dashboard access, capabilities, and existing permission keys. Keep `requireAuth` and `requirePermission` as compatibility boundaries while migrating routes.
7. Replace unrestricted role assignment with policy-checked operations. At minimum: deny self-escalation, deny assigning/removing capabilities without the specific grant permission, deny assigning offices without the appointment permission, and prevent Technical Head from being used as a blanket substitute for President authority.
8. Add audit records for office, dashboard, capability, and permission-sensitive mutations. Existing `system_events` is operational logging, not a complete authorization audit trail.

No Phase A migration should silently convert every current role into a dashboard or automatically map an office to a subgroup.

## PRESIDENT BACKEND CONTRACT AND IMPLEMENTATION PLAN

This section describes the exact Phase B contract to implement after Phase A. Routes marked **NEW** do not currently exist and must not be mocked in the frontend.

### President access boundary

President dashboard access should be granted only by explicit dashboard access associated with the President dashboard policy. A user with the President executive office but no dashboard assignment must not automatically pass dashboard access. A user with Technical Head but no President dashboard must not pass President routes. All routes require a valid `asf_session`; `requireAuth` must continue to reject inactive, suspended, and deactivated accounts.

President policy must allow roster visibility, program oversight, governance review once governance exists, handover review once handover exists, and analytics derived from real member/program records. It must not grant announcements creation, arbitrary member edits, password changes, status changes, arbitrary role/subgroup changes, academic overrides, media access, CMS access, Bible Study authoring, or Technical Console access unless a separate capability/permission also grants that operation.

### Reusable existing endpoints

| Method and route | Current status | President use |
|---|---|---|
| `GET /api/members` | Exists; `members.view_directory` | Reuse only after response/filter contract adds canonical office and subgroup data |
| `GET /api/members/:id` | Exists; directory permission | Reuse for member detail, with the same data boundary |
| `GET /api/events` | Exists; authenticated | Reuse for program oversight while retaining the events infrastructure |
| `GET /api/events/featured` | Exists | Reuse only as current upcoming-active event; it is not a featured-toggle API |
| `GET /api/system/health` | Exists; `system.logs.view` | Do not expose through President dashboard unless explicitly granted; it is technical data |
| `GET /api/system/pulse` | Exists; `system.logs.view` | Technical Head concern, not President by default |

### New President contract (Phase B)

#### 1. Roster

`GET /api/president/roster` **NEW**

- Authentication: active session required.
- Permission: `president.roster.view` (resolved from explicit President dashboard access/policy, not frontend persona).
- Query: `page`, `limit`, `search`, `academicLevel`, `subgroup`, `office`, and `departmentId`.
- Response: `{ data: [{ id, name, department, departmentId, academicLevel, membershipStatus, subgroup, executiveOffices: [{ id, name }], avatarUrl }], meta: { total, page, limit } }`.
- Validation: bounded pagination; academic level enum; subgroup must be one of nine canonical values; office must be a known office ID; department must be a known department ID.
- Errors: `401 NO_SESSION` or `INVALID_SESSION`, `403 PERMISSION_DENIED`, `400 VALIDATION_ERROR`.
- Records: read-only joins across users, departments, executive-office assignments, and canonical subgroup data. No fake roster table.
- Audit: no audit event for reads; access may be included in future security telemetry.

#### 2. Programs

Reuse `GET /api/events` for initial oversight. Do not add a new `/api/programs` endpoint solely because the UI calls events programs.

If President program creation/approval is later approved, modify the existing event contract in a versioned change. The target request shape is `{ title, date, time, venue, description?, guestMinister?, image?, mode: "Physical" | "Online" }`; category, generic attendance mode, end time, speaker role/title, and header image URL are not part of the target frontend contract. The existing event schema currently differs, so this is a contract decision and migration, not a rename-only change. No RSVP endpoint is proposed.

#### 3. Governance

No President governance endpoint should be shipped in Phase B until actions are defined. The existing `governance.approve` key is not evidence of a working workflow.

Required future contract shape:

- `POST /api/governance/requests` — authenticated requester, action-specific permission, creates `PENDING` request and audit event.
- `GET /api/president/governance/requests` — President review permission, returns pending/history requests.
- `POST /api/president/governance/requests/:id/approve` — President review permission, validates state and action, performs the approved operation transactionally, writes audit record.
- `POST /api/president/governance/requests/:id/reject` — President review permission, requires reason, writes audit record.

Exact request actions, affected records, and error codes must be approved before implementation. The frontend must not invent arbitrary governance actions.

#### 4. Executive handover

No handover endpoint exists. The required future workflow is:

- `POST /api/president/handovers` — upload/submit CSV, validate only, persist a reviewable draft;
- `GET /api/president/handovers/:id` — review validation results and proposed assignments;
- `POST /api/president/handovers/:id/approve` — President approval, transactional transition;
- `POST /api/president/handovers/:id/publish` — publish approved office assignments and audit the transition.

CSV validation must reject unknown members/offices, duplicate assignments, invalid office cardinality, and malformed rows. Approval must update office assignments without deleting outgoing user accounts. These routes are **not implemented** and must not be simulated with client-side CSV parsing.

#### 5. Analytics

`GET /api/president/analytics` **NEW**

- Authentication: active session required.
- Permission: `president.analytics.view`.
- Query: optional academic session ID and subgroup/office filters using the same canonical validators as roster.
- Response: counts and distributions computed from users, canonical subgroup assignments, executive-office assignments, and existing program records; no fabricated metrics.
- Errors: `401`, `403`, `400 VALIDATION_ERROR`, and `404` for an unknown academic session.
- Audit: read-only; no mutation audit event.

### President must not receive through this phase

Do not grant President access to `POST /api/announcements`, member role/status/password/subgroup mutation routes, academic override routes, media routes, CMS routes, Bible Study authoring routes, or system technical routes merely because the user holds the President office. Existing broad President permissions in `permissions.config.ts` must be reviewed and narrowed as part of the authorization migration, with compatibility tests before removal.

### Required authorization tests

Add tests for each new policy boundary: President dashboard holder succeeds; ordinary member receives `403`; inactive/suspended/deactivated President receives `403 ACCOUNT_NOT_ACTIVE`; President office without dashboard receives `403`; Technical Head without President dashboard receives `403` for President routes; Technical Head plus President dashboard succeeds only where both policies allow; self-office/capability escalation is denied; non-authorized actors cannot appoint offices, grant dashboard access, or grant Technical Head; and removing an office does not remove membership or delete the user.

### Implementation status of this report

This pass makes no backend code or migration changes. It records the verified current state and the contracts that must be agreed before implementation. The existing detailed sections below are the evidence inventory; they should not be read as proof that proposed President, governance, handover, or Technical Head endpoints already exist.

## 1. EXECUTIVE SUMMARY

- The backend authority is a cookie-based session system, not a frontend persona or localStorage matrix.
- Authentication is enforced in [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts), and authorization is enforced in [src/middleware/requirePermission.ts](src/middleware/requirePermission.ts).
- Roles are stored in the `roles` table and linked to users via `user_roles`; the canonical seed is in [src/db/seeds/rolesSeed.ts](src/db/seeds/rolesSeed.ts). The permission matrix is in [src/config/permissions.config.ts](src/config/permissions.config.ts).
- The backend is role-based, with account status gating and some per-route permission checks. There is no office-assignment authorization model found in the backend code.
- Most admin capabilities are real and route-backed, but some frontend assumptions are not. Notably, there is no backend `/api/bible-study/:id/reschedule` route, no explicit “featured event” toggle, and no generic role/permission CRUD admin system beyond the existing member-role patch route.
- The most important boundary issue is that the backend does not enforce a role hierarchy when changing roles: any user who has `members.edit_role` can assign an existing role to another user if the role exists in the `roles` table; there is no check preventing a `Technical Administrator` from assigning a `President / Executive` role or vice versa. This is evidence-backed in [src/modules/members/members.service.ts](src/modules/members/members.service.ts) and [src/modules/members/members.repository.ts](src/modules/members/members.repository.ts), but it is not proven to be an exploit by itself without broader operational controls.
- The backend does not support a broad “admin console” beyond the modules actually wired in [src/app.ts](src/app.ts).

## 2. AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### Authentication mechanism
- The backend authenticates by reading the `asf_session` HTTP-only cookie from the request, hashing it, and checking it against the `user_sessions` table.
- The logic is in [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts).
- The session token is created at login/register/verify in [src/modules/auth/auth.service.ts](src/modules/auth/auth.service.ts) and [src/modules/auth/auth.controller.ts](src/modules/auth/auth.controller.ts).

### Session / cookie behavior
- Cookie name: `asf_session`
- Cookie attributes:
  - `httpOnly: true`
  - `secure: env.NODE_ENV === "production"`
  - `sameSite: env.NODE_ENV === "production" ? "none" : "lax"`
  - `path: "/"`

### How the authenticated user is identified
- `requireAuth` loads the active session by hash and then loads the user by `session.userId`.
- It populates:
  - `req.user.id`
  - `req.user.email`
  - `req.user.name`
  - `req.user.department`
  - `req.user.departmentId`
  - `req.user.gender`
  - `req.user.academicLevel`
  - `req.user.accountStatus`
  - `req.user.roles`
- It also sets `req.sessionId`.

### Where the authenticated user is loaded
- [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts)

### How roles are loaded
- After user lookup, it calls `authRepository.getUserRolesByUserId(user.id)`.
- That repository function reads from `user_roles` and returns role IDs in [src/modules/auth/auth.repository.ts](src/modules/auth/auth.repository.ts).

### How permissions are loaded
- Permission matrix is loaded from [src/config/permissions.config.ts](src/config/permissions.config.ts).
- `requirePermission(permissionKey)` checks whether any role in `req.user.roles` is included in the allowed role array for that permission.

### Authorization model
- Primary model: role-based authorization.
- Secondary gate: `accountStatus !== "Active"` is blocked in `requireAuth`.
- No office-assignment authorization model was found.
- No explicit organization-level “team” or “office” permission checks were found in code or routes.
- There is no evidence of a separate “admin persona” or frontend-only role factor.

### Exact authorization middleware / guards / helpers
- `requireAuth` is the authentication gate.
- `requirePermission(permissionKey)` is the permission gate.
- Both are in:
  - [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts)
  - [src/middleware/requirePermission.ts](src/middleware/requirePermission.ts)

### Exact behavior for key cases
- Unauthenticated request:
  - no `asf_session` cookie -> `AppError.unauthorized("Not authenticated", "NO_SESSION")`
  - HTTP status: `401`
- Invalid or expired session:
  - session hash not found -> `INVALID_SESSION`
  - HTTP status: `401`
- Authenticated member:
  - accepted if session valid and `user.accountStatus === "Active"`
- Authenticated administrator:
  - accepted if session valid and roles include allowed permission/role
- Authenticated user with insufficient permission:
  - `requirePermission` -> `AppError.forbidden("You lack permission to perform this action", "PERMISSION_DENIED")`
  - HTTP status: `403`
- Inactive/suspended account:
  - `requireAuth` blocks any `accountStatus` other than `"Active"` with `ACCOUNT_NOT_ACTIVE`
  - login/verify also rejects suspended accounts with `ACCOUNT_SUSPENDED` or `ACCOUNT_NOT_ACTIVE`
  - HTTP status: `403`
- Unknown role:
  - role assignment fails with `INVALID_ROLE` when `roleExists` returns null
  - HTTP status: `400`
- Malformed / missing auth information:
  - missing or invalid cookie -> `401`
  - malformed role payload -> `400`
  - malformed UUID route param -> `400 INVALID_ID_FORMAT`

### Status codes used
- `401 Unauthorized`:
  - `NO_SESSION`
  - `INVALID_SESSION`
  - invalid credentials
- `403 Forbidden`:
  - `ACCOUNT_NOT_ACTIVE`
  - `ACCOUNT_SUSPENDED`
  - `PERMISSION_DENIED`
  - `ALREADY_IN_SUBGROUP`
- `400 Bad Request`:
  - validation and missing required fields
  - invalid role or invalid params
- `404 Not Found`:
  - resource not found
- `409 Conflict`:
  - duplicate existing record / already active / already cancelled

## 3. CANONICAL BACKEND ROLES

### Source of truth
The backend source of truth is the `roles` table, seeded by [src/db/seeds/rolesSeed.ts](src/db/seeds/rolesSeed.ts). The schema is in [src/db/schema/roles.ts](src/db/schema/roles.ts), and actual user-role assignments are in [src/db/schema/userRoles.ts](src/db/schema/userRoles.ts).

### Canonical backend roles
These are the actual role IDs defined and seeded:

- Member
- FS Student
- FS Teacher
- VP / FS Coordinator
- Bible Study Coordinator
- Publicity Coordinator
- General Secretary
- Organizing Coordinator
- Drama Coordinator
- Prayer Coordinator
- Financial Secretary
- Treasurer
- Librarian
- President / Executive
- Technical Administrator

### Active/supported roles
All of the above are defined in the seed and thus are active in the backend, subject to being inserted into `user_roles`. There is no backend code that disables or deactivates any of them.

### Notably missing from backend
The backend does not define or seed the following names as real role IDs:
- any frontend-only role not present in [src/db/seeds/rolesSeed.ts](src/db/seeds/rolesSeed.ts)
- any office-only synonyms not in the role table
- generic permissions or “admin persona” values

### Important evidence
- [src/db/schema/roles.ts](src/db/schema/roles.ts)
- [src/db/seeds/rolesSeed.ts](src/db/seeds/rolesSeed.ts)
- [src/config/permissions.config.ts](src/config/permissions.config.ts)

## 4. CANONICAL BACKEND PERMISSIONS

The actual permission source is [src/config/permissions.config.ts](src/config/permissions.config.ts).

### Actual backend permissions
- `members.view_directory`
- `members.view_private`
- `members.edit_role`
- `members.edit_status`
- `academic.rollover`
- `website.edit_draft`
- `website.publish`
- `bible_study.create`
- `bible_study.publish`
- `fs.admissions.review`
- `fs.students.grade`
- `fs.students.record_completion`
- `events.create_edit`
- `announcements.publish`
- `media.upload`
- `governance.approve`
- `system.logs.view`
- `members.edit_subgroup`

### Permission usage found in routes
- [src/modules/members/members.routes.ts](src/modules/members/members.routes.ts)
- [src/modules/academic-session/academicSession.routes.ts](src/modules/academic-session/academicSession.routes.ts)
- [src/modules/bible-study/bibleStudy.routes.ts](src/modules/bible-study/bibleStudy.routes.ts)
- [src/modules/events/events.routes.ts](src/modules/events/events.routes.ts)
- [src/modules/fs/fsAdmissions.routes.ts](src/modules/fs/fsAdmissions.routes.ts)
- [src/modules/fs/fsStudents.routes.ts](src/modules/fs/fsStudents.routes.ts)
- [src/modules/media/media.routes.ts](src/modules/media/media.routes.ts)
- [src/modules/announcements/announcements.routes.ts](src/modules/announcements/announcements.routes.ts)
- [src/modules/system/system.routes.ts](src/modules/system/system.routes.ts)
- [src/modules/cms/cms.routes.ts](src/modules/cms/cms.routes.ts)

### Permissions that appear declared but unused
- `fs.students.grade` is present in config but no route was found that uses it.
- `governance.approve` is present in config but no route/service uses it.
- `members.view_private` is used internally to decide private data visibility rather than as a direct route guard.

## 5. ROLE → PERMISSION / AUTHORIZATION MATRIX

### Role-to-module matrix
Legend: ✓ = backend permits, ✗ = backend denies, △ = partial/action-specific, ? = cannot verify

| Backend Role | Members | Events | Bible Study | Academic Sessions | Media | Departments | FS | Other Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Member | ✓ view directory | ✗ | ✓ read published only | ✗ | ✗ | ✓ public read | ✓ apply for FS | ✗ |
| FS Student | ✓ directory | ✗ | ✓ read published only | ✗ | ✗ | ✓ public read | △ student-specific | ✗ |
| FS Teacher | ✓ view directory | ✗ | ✓ read published only | ✗ | ✗ | ✓ public read | △ FS review/grade support implied | ✗ |
| VP / FS Coordinator | ✓ private access | ✗ | ✓ create/publish in config | ✗ | ✗ | ✓ public read | ✓ fs.admissions.review + fs.students.record_completion | △ |
| Bible Study Coordinator | ✓ directory | ✗ | ✓ create/publish | ✗ | ✗ | ✓ public read | ✗ | △ |
| Publicity Coordinator | ✓ directory | ✓ create_edit | ✗ | ✗ | ✓ media.upload | ✓ public read | ✗ | △ announcements.publish |
| General Secretary | ✓ directory | ✓ create_edit | ✗ | ✓ academic.rollover | ✗ | ✓ public read | ✗ | △ announcements.publish |
| President / Executive | ✓ private access | ✗ | ✓ create/publish | ✓ academic.rollover | ✓ media.upload | ✓ public read | ✓ fs.admissions.review | ✓ announcements.publish + system logs |
| Technical Administrator | ✓ private access | ✓ create_edit | ✓ create/publish | ✓ academic.rollover | ✓ media.upload | ✓ public read | ✓ fs.admissions.review | ✓ system.logs.view + others |
| Organizing Coordinator | ? | ? | ? | ? | ? | ? | ? | ? |
| Drama Coordinator | ? | ? | ? | ? | ? | ? | ? | ? |
| Prayer Coordinator | ? | ? | ? | ? | ? | ? | ? | ? |
| Financial Secretary | ? | ? | ? | ? | ? | ? | ? | ? |
| Treasurer | ? | ? | ? | ? | ? | ? | ? | ? |
| Librarian | ? | ? | ? | ? | ? | ? | ? | ? |

### Action-level matrix
| Action | Requires auth | Permission/Role | Backend status |
|---|---:|---|---|
| View member directory | Yes | `members.view_directory` | ✓ |
| View private member details | Yes | `members.view_private` | ✓ |
| Edit member role | Yes | `members.edit_role` | ✓ |
| Edit account status | Yes | `members.edit_status` | ✓ |
| Override academic level | Yes | `academic.rollover` | ✓ |
| Reset password admin-side | Yes | `members.edit_status` | ✓ |
| Update subgroup | Yes | `members.edit_subgroup` | ✓ |
| Create Bible Study lesson | Yes | `bible_study.create` | ✓ |
| Publish Bible Study lesson | Yes | `bible_study.publish` | ✓ |
| Read unpublished Bible Study lesson | Yes | `bible_study.create` | ✓ |
| Create event | Yes | `events.create_edit` | ✓ |
| Update event | Yes | `events.create_edit` | ✓ |
| Cancel event | Yes | `events.create_edit` | ✓ |
| Activate and progress academic session | Yes | `academic.rollover` | ✓ |
| Upload media asset | Yes | `media.upload` | ✓ |
| Assign media placement | Yes | `media.upload` | ✓ |
| Create department | Yes | `members.edit_role` | ✓ |
| FS admissions review | Yes | `fs.admissions.review` | ✓ |
| FS student completion record | Yes | `fs.students.record_completion` | ✓ |
| View system health | Yes | `system.logs.view` | ✓ |

## 6. MEMBER ADMINISTRATION

### Endpoint inventory
- `GET /api/members` — route in [src/modules/members/members.routes.ts](src/modules/members/members.routes.ts)
- `GET /api/members/:id`
- `PATCH /api/members/:id/role`
- `PATCH /api/members/:id/status`
- `PATCH /api/members/:id/academic-level`
- `PATCH /api/members/:id/reset-password`
- `PATCH /api/members/:id/subgroup`

### Route permissions
| Route | Auth | Required permission | Notes |
|---|---:|---|---|
| `GET /api/members` | Yes | `members.view_directory` | private data hidden unless role in `members.view_private` |
| `GET /api/members/:id` | Yes | `members.view_directory` | same as above |
| `PATCH /api/members/:id/role` | Yes | `members.edit_role` | controller method `updateRole` |
| `PATCH /api/members/:id/status` | Yes | `members.edit_status` | controller method `updateStatus` |
| `PATCH /api/members/:id/academic-level` | Yes | `academic.rollover` | controller method `overrideLevel` |
| `PATCH /api/members/:id/reset-password` | Yes | `members.edit_status` | controller method `resetPassword` |
| `PATCH /api/members/:id/subgroup` | Yes | `members.edit_subgroup` | controller method `updateSubgroup` |

### Request / validation details
- Role update:
  - body schema: `action` must be `"assign"` or `"remove"`, `roleId` required
  - [src/modules/members/members.validation.ts](src/modules/members/members.validation.ts)
- Account status:
  - `accountStatus` enum: `"Active" | "Suspended" | "Deactivated"`
- Academic level override:
  - valid values: `"100 Level"..."500 Level","Postgraduate","Alumni"`
  - `overrideReason` min length 5
- Reset password:
  - `newPassword` min length 8
- Subgroup:
  - `subgroup` required string

### Success behavior
- `PATCH /api/members/:id/role`
  - calls `updateMemberRole`
  - checks `roleExists`
  - if action assign, inserts `user_roles` row
  - if remove, removes row unless role is `"Member"`, which is explicitly forbidden
  - returns updated user without password hash
- `PATCH /api/members/:id/status`
  - blocks self-modification
  - calls `updateAccountStatus`
  - if status changes away from `"Active"`, revokes all sessions
- `PATCH /api/members/:id/academic-level`
  - requires an active academic session
  - sets `membershipStatus` to `"Alumni"` when new level is `"Alumni"`, otherwise `"Active Student"`
  - records override in `userAcademicHistory`
- `PATCH /api/members/:id/reset-password`
  - updates `passwordHash`
- `PATCH /api/members/:id/subgroup`
  - updates subgroup field

### Unauthorized / forbidden responses
- No cookie -> `401`
- Insufficient role/permission -> `403 PERMISSION_DENIED`
- Self-status change attempt -> `400 CANNOT_SELF_MODIFY`
- Invalid role -> `400 INVALID_ROLE`
- Invalid member id -> `400 INVALID_ID_FORMAT`
- Member not found -> `404 MEMBER_NOT_FOUND`

### Who can assign roles?
- By backend config only:
  - `President / Executive`
  - `Technical Administrator`
- This is enforced by `requirePermission("members.edit_role")`.
- There is no additional hierarchy restriction or actor-vs-target comparison.

### Can they assign privileged roles?
- The backend only checks whether the target role ID exists in the `roles` table.
- It does not block assigning `President / Executive` or other privileged roles to another person.
- This means a `Technical Administrator` who passes `members.edit_role` can assign any existing current role ID, including a high-privilege one, unless the route or business logic adds another guard later.
- This is a backend-boundary issue requiring review; it is not proved to be a vulnerability alone, but it is real.

### Account status authority
- `PATCH /api/members/:id/status` is allowed only to users with `members.edit_status`.
- The acting user cannot change their own account status.
- This is enforced in [src/modules/members/members.service.ts](src/modules/members/members.service.ts).

### Academic level override authority
- `PATCH /api/members/:id/academic-level` is allowed for:
  - `General Secretary`
  - `President / Executive`
  - `Technical Administrator`
- Defined by `academic.rollover` in [src/config/permissions.config.ts](src/config/permissions.config.ts)

### Password reset authority
- `PATCH /api/members/:id/reset-password` uses the same permission as status updates: `members.edit_status`.
- No self-reset restriction exists here.

### Subgroup authority
- `PATCH /api/members/:id/subgroup` requires `members.edit_subgroup`.
- Allowed roles:
  - `Publicity Coordinator`
  - `President / Executive`
  - `Technical Administrator`

## 7. BIBLE STUDY AUTHORIZATION

### Existing routes
- `GET /api/bible-study/current` — authenticated only
- `GET /api/bible-study`
- `GET /api/bible-study/:id`
- `POST /api/bible-study`
- `PUT /api/bible-study/:id`
- `PATCH /api/bible-study/:id/publish`
- `POST /api/bible-study/upload-outline`
- `POST /api/bible-study/series`
- `GET /api/bible-study/series/:id`
- `GET /api/bible-study/aliases`
- `POST /api/bible-study/aliases`
- `POST /api/bible-study/book-aliases`

### Authorization
| Route | Auth | Permission |
|---|---:|---|
| `GET /api/bible-study/current` | Yes | none |
| `GET /api/bible-study` | Yes | none; but can reveal draft content only if actor has `bible_study.create` |
| `GET /api/bible-study/:id` | Yes | none; draft visibility checks inside controller |
| `POST /api/bible-study` | Yes | `bible_study.create` |
| `PUT /api/bible-study/:id` | Yes | `bible_study.create` |
| `PATCH /api/bible-study/:id/publish` | Yes | `bible_study.publish` |
| `POST /api/bible-study/upload-outline` | Yes | `bible_study.create` |
| `POST /api/bible-study/series` | Yes | `bible_study.create` |
| `GET /api/bible-study/series/:id` | Yes | none; uses `bible_study.create` to decide unpublished visibility |

### draft visibility
- In [src/modules/bible-study/bibleStudy.controller.ts](src/modules/bible-study/bibleStudy.controller.ts):
  - `const canSeeUnpublished = hasPermission(req, "bible_study.create")`
  - If the actor has the create permission, they can read unpublished lessons and series.
  - Otherwise, they only see published lessons.

### Publish / create / reschedule status
- `bible_study.create` roles:
  - `Bible Study Coordinator`
  - `President / Executive`
  - `Technical Administrator`
- `bible_study.publish` roles:
  - same as above
- `General Secretary` is not granted either permission.
- `Publicity Coordinator` is not granted either permission.
- `FS Teacher`, etc. are not granted either permission.
- There is no backend route called `/api/bible-study/:id/reschedule` in the router or controller. This is not implemented.
- The frontend route reported as `PATCH /api/bible-study/:id/reschedule` is not found in backend code.

### Series creation
- `POST /api/bible-study/series`
- Requires `bible_study.create`
- Combined with lesson validation:
  - `startDate` must be a Tuesday
  - at least one lesson
  - sequential lesson numbers
  - scheduled dates computed from `generateWeeklySchedule`
- This is code-backed in [src/modules/bible-study/bibleStudy.service.ts](src/modules/bible-study/bibleStudy.service.ts).

### Current backend truth
The backend supports Bible Study authoring and publishing operations, but not a separate “reschedule” endpoint.

## 8. EVENTS AUTHORIZATION

### Existing routes
- `GET /api/events`
- `GET /api/events/featured`
- `POST /api/events`
- `PUT /api/events/:id`
- `PATCH /api/events/:id/cancel`

### Authorization
| Route | Auth | Required permission |
|---|---:|---|
| `GET /api/events` | Yes | none |
| `GET /api/events/featured` | Yes | none |
| `POST /api/events` | Yes | `events.create_edit` |
| `PUT /api/events/:id` | Yes | `events.create_edit` |
| `PATCH /api/events/:id/cancel` | Yes | `events.create_edit` |

### Who can create/edit/cancel
- `events.create_edit` allowed roles:
  - `Publicity Coordinator`
  - `General Secretary`
  - `Technical Administrator`
- `President / Executive` is explicitly not in the permission matrix.
- This matches the behavioral test evidence in [tests/rbac.test.ts](tests/rbac.test.ts): President gets `403` when creating an event.

### Soft cancellation behavior
- Cancellation is not delete; it updates `events.status` to `"Cancelled"`.
- [src/modules/events/events.repository.ts](src/modules/events/events.repository.ts)
- It is “soft cancellation” behavior, because rows remain in the table with `status = "Cancelled"`.

### Visibility after cancel
- `listEvents` does not filter out cancelled rows; it simply orders by date.
- `getFeatured` only selects future events where `status = "Active"`.
- Therefore cancelled events are not featured but still may remain visible in general list results.

### Featured events
- The backend does have `GET /api/events/featured`, but it is not an explicit “featured flag” feature.
- `getFeatured()` selects the earliest upcoming event whose `status` is `"Active"`.
- There is no separate `isFeatured` field or admin toggle.

### Exact validation
- `createEventSchema` and `updateEventSchema` in [src/modules/events/events.validation.ts](src/modules/events/events.validation.ts)
- Required fields:
  - `title`
  - `location`
  - `startTime`
- Optional:
  - `category`
  - `description`
  - `endTime`
  - `speaker`
  - `speakerRole`
  - `mode`
  - `theme`
  - `imageUrl`
- No backend check that endTime is after startTime was found.

### Error responses
- invalid payload -> `400 VALIDATION_ERROR`
- event missing -> `404 EVENT_NOT_FOUND`
- already cancelled -> `409 ALREADY_CANCELLED`

### Conclusion
The frontend claim that President / Executive is blocked from event mutation is accurate for the backend. The backend independently enforces it via permission config and route checks.

## 9. ACADEMIC SESSION AUTHORIZATION

### Existing routes
- `GET /api/academic-sessions`
- `POST /api/academic-sessions`
- `GET /api/academic-sessions/active`
- `POST /api/academic-sessions/:id/activate-and-progress`

### Authorization
| Route | Auth | Permission |
|---|---:|---|
| `GET /api/academic-sessions` | Yes | `academic.rollover` |
| `POST /api/academic-sessions` | Yes | `academic.rollover` |
| `GET /api/academic-sessions/active` | Yes | none |
| `POST /api/academic-sessions/:id/activate-and-progress` | Yes | `academic.rollover` |

### Allowed roles
`academic.rollover` is granted to:
- `General Secretary`
- `President / Executive`
- `Technical Administrator`

### Additional notes
- `President / Executive` does have this permission.
- `Technical Administrator` is included.
- There is no evidence of a special “academic authority” for other roles.
- `POST /api/academic-sessions/:id/progress` does not exist in the backend.

### Validation
- `createSessionSchema` requires:
  - `id` format like `YYYY/YYYY`
  - `name`
  - `startDate`
  - `endDate`
- [src/modules/academic-session/academicSession.validation.ts](src/modules/academic-session/academicSession.validation.ts)

### Side effects of activate-and-progress
In [src/modules/academic-session/academicSession.service.ts](src/modules/academic-session/academicSession.service.ts):
- finds target session
- rejects if already active
- gets active students excluding alumni
- for each student:
  - applies progression rule from [src/config/progressionRules.config.ts](src/config/progressionRules.config.ts)
  - updates `users.academicLevel`
  - updates `users.membershipStatus`
  - records history in `userAcademicHistory`
- deactivates current session
- activates new session

This is a high-impact operation, and the only backend protection is the `academic.rollover` permission. There is no extra “restricted to president only” or additional escalation barrier beyond that permission.

## 10. MEDIA AUTHORIZATION

### Existing routes
- `GET /api/media/placements`
- `GET /api/media/placements/:key`
- `GET /api/media/assets`
- `POST /api/media/assets`
- `PUT /api/media/placements/:key`
- `DELETE /api/media/assets/:assetId`

### Authorization
| Route | Auth | Permission |
|---|---:|---|
| `GET /api/media/placements` | No | public |
| `GET /api/media/placements/:key` | No | public |
| `GET /api/media/assets` | Yes | `media.upload` |
| `POST /api/media/assets` | Yes | `media.upload` |
| `PUT /api/media/placements/:key` | Yes | `media.upload` |
| `DELETE /api/media/assets/:assetId` | Yes | `media.upload` |

### Who can upload / assign / delete
- `media.upload` roles:
  - `Publicity Coordinator`
  - `President / Executive`
  - `Technical Administrator`

### Placement key restrictions
- Placement keys are validated by regex in [src/modules/media/media.validation.ts](src/modules/media/media.validation.ts):
  - lowercase alphanumerics with dots, underscores, or hyphen separators
- No hardcoded whitelist of placement keys was found.
- `public.bible-study.theme` is a valid placement key and is used in tests.

### `public.bible-study.theme` behavior
- Public GET works and returns `asset: null` if unset.
- Authenticated admin with `media.upload` may assign an asset using `PUT /api/media/placements/public.bible-study.theme`
- This is verified in [tests/bibleStudyThemeMedia.test.ts](tests/bibleStudyThemeMedia.test.ts).

### Allocation / deletion difference
- Assignment and deletion use the same permission: `media.upload`.
- There is no separate `media.assign` or `media.delete` permission.

## 11. DEPARTMENT AUTHORIZATION

### Existing routes
- `GET /api/departments`
- `POST /api/departments`

### Current backend truth
| Route | Auth | Permission |
|---|---:|---|
| `GET /api/departments` | No | public |
| `POST /api/departments` | Yes | `members.edit_role` |

### Notes
- `GET /api/departments` is public; no auth required.
- `POST /api/departments` is protected behind `requirePermission("members.edit_role")`, meaning it is effectively limited to:
  - `President / Executive`
  - `Technical Administrator`
- No update endpoint or delete endpoint was found in the backend.
- The backend supports creating departments, but not a full department admin lifecycle.
- This appears backend-supported but narrow in scope.

## 12. FOUNDATIONAL SCHOOL / FS AUTHORIZATION

### Existing routes
The following are real backend routes:

- `POST /api/fs/admissions` — authenticated, no special permission
- `GET /api/fs/admissions/admin` — requires `fs.admissions.review`
- `PATCH /api/fs/admissions/admin/:id/review` — requires `fs.admissions.review`
- `GET /api/fs/students` — requires `fs.admissions.review`
- `PATCH /api/fs/students/:id/record-completion` — requires `fs.students.record_completion`
- `PATCH /api/fs/students/:id/withdraw` — requires `fs.admissions.review`
- `POST /api/fs/students/bulk-graduate` — requires `fs.admissions.review`
- `POST /api/fs/manual` — requires `fs.admissions.review`
- `GET /api/fs/manual` — authenticated, no explicit permission check in route

### Exact authorization
- `fs.admissions.review` roles:
  - `VP / FS Coordinator`
  - `President / Executive`
  - `Technical Administrator`
- `fs.students.record_completion` roles:
  - `VP / FS Coordinator`
  - `President / Executive`

### FS administration is production-backed
- Services and validation are implemented in:
  - [src/modules/fs/fsAdmissions.controller.ts](src/modules/fs/fsAdmissions.controller.ts)
  - [src/modules/fs/fsAdmissions.service.ts](src/modules/fs/fsAdmissions.service.ts)
  - [src/modules/fs/fsStudents.controller.ts](src/modules/fs/fsStudents.controller.ts)
  - [src/modules/fs/fsStudents.service.ts](src/modules/fs/fsStudents.service.ts)
  - [src/modules/fs/fsManual.routes.ts](src/modules/fs/fsManual.routes.ts)

### Frontend-reported FS endpoints
The backend confirms the following frontend-reported endpoints exist:
- `GET /api/fs/admissions/admin`
- `PATCH /api/fs/admissions/admin/:id/review`
- `GET /api/fs/students`
- `PATCH /api/fs/students/:id/record-completion`
- `PATCH /api/fs/students/:id/withdraw`
- `POST /api/fs/students/bulk-graduate`
- `POST /api/fs/manual`

### Not found / not implemented
- No frontend-reported `GET /api/fs/admissions/admin/:id` route was found beyond the review patch.
- The backend does not expose a separate `PATCH /api/fs/students/:id/record-completion` by a different naming pattern; the real route is present.

## 13. OTHER ADMINISTRATIVE CAPABILITIES

### Implemented in backend
These are backend-supported and route-backed:
- announcements workflow
- website content draft/publish
- system health/pulse
- media asset management
- member directory and role/status management
- academic session creation/activation
- departments
- FS admissions and student records
- Bible Study authoring and publication

### Declared but not actually wired
- `governance.approve` is declared in the permission config but no route or service was found.
- `fs.students.grade` is declared but no route uses it.

### Not found in backend
The following were not found to be implemented:
- leadership / handover workflow
- governance approvals
- role CRUD admin panel
- permission CRUD admin panel
- audit log viewer
- backup or restore endpoints
- maintenance mode toggles
- feature flag system
- config editor for environment/system settings
- moderation / approval dashboard beyond the announcement workflow

### Conclusion
The backend has a real but bounded admin surface. It does not support a broad enterprise-type admin console, and many frontend admin screens are likely frontend-only concepts.

## 14. ROLE ASSIGNMENT & PRIVILEGE ESCALATION

### Assignment flow
Frontend request → route → controller → service → repository → database

Concrete example:
- `PATCH /api/members/:id/role`
- route in [src/modules/members/members.routes.ts](src/modules/members/members.routes.ts)
- controller in [src/modules/members/members.controller.ts](src/modules/members/members.controller.ts)
- service in [src/modules/members/members.service.ts](src/modules/members/members.service.ts)
- repository in [src/modules/members/members.repository.ts](src/modules/members/members.repository.ts)
- writes to `user_roles` table via `assignRole`/`removeRole`

### Who can assign roles?
- only `members.edit_role` actors:
  - `President / Executive`
  - `Technical Administrator`

### What roles can they assign?
- Any role ID that exists in the `roles` table.
- The service checks `roleExists`.
- It does not check a restricted list of “assignable” roles beyond the existence check.

### Self-escalation checks
- None found for role assignment.
- There is no check preventing an admin from assigning themselves or another user a higher-privilege role.

### Technical Administrator authority
- `Technical Administrator` is in the same permission group as `President / Executive` for role assignment.
- This is not “special-case” code; it is permission config.

### President / Executive authority
- Same as above: same `members.edit_role` permission grant.

### General Secretary authority
- No direct role assignment permission.
- Not allowed by backend permission matrix.

### Privilege escalation assessment
- Confirmed: the actual backend permission model does not encode a hierarchy or target-role veto.
- Requires review: whether a `Technical Administrator` should be able to assign `President / Executive` is a policy question; the backend does not prevent it.
- Not implemented: there is no “cannot assign role above your level” guard.

## 15. BACKEND TEST VERIFICATION

I ran a focused authorization verification using the backend test suite. The output showed the expected authorization behaviors for many endpoints, but the full batch timed out in this environment before final completion. The relevant real evidence remains in the captured output and the route tests.

### Verified patterns from tests
- [tests/rbac.test.ts](tests/rbac.test.ts)
  - `Member` blocked from `GET /api/fs/admissions/admin` -> `403`
  - `President` can view events but is blocked from creating one -> `403`
  - unauthenticated request -> `401`
- [tests/bibleStudyThemeMedia.test.ts](tests/bibleStudyThemeMedia.test.ts)
  - member is blocked from assigning media placement -> `403`
  - admin assigns successfully -> `200`
- [tests/events.test.ts](tests/events.test.ts)
  - event creation/edit/cancel logic is route+permission guarded
- [tests/members.test.ts](tests/members.test.ts)
  - public directory vs private visibility logic verified
- [tests/fs.test.ts](tests/fs.test.ts)
  - FS application and review flows are implemented and permission-protected
- [tests/announcements.test.ts](tests/announcements.test.ts)
  - announcements required permission and block member creation -> `403`

### Test evidence summary
- Auth-explicit checks consistently returned:
  - `401` for no session
  - `403` for missing permission
  - `200` for authorized operations
- This aligns with the backend code in [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts) and [src/middleware/requirePermission.ts](src/middleware/requirePermission.ts)

## 16. FRONTEND CONTRACT MISMATCH REPORT

### Mismatches identified
- Frontend suggests a `PATCH /api/bible-study/:id/reschedule`; backend has no such route.
- Frontend suggests a hardcoded President event mutation restriction; the backend independently enforces that restriction.
- Frontend uses role names as UI labels; backend uses actual role IDs in DB and permission matrix.
- Frontend may imply more granular permission management than exists; backend has only a small static permission map.
- Frontend may imply broader governance / admin domain than backend has.
- Frontend localStorage “persona” is not part of backend identity. The backend uses only the authenticated session cookie.
- Some frontend admin screens likely represent mock or partial workflows, while actual backend routes exist for a narrower set of operations.

### Key mismatch examples
- Event mutation restriction:
  - frontend assumption: President should be restricted.
  - backend reality: it is restricted by permission config, not by frontend.
- Role assignment:
  - frontend may show a narrower admin matrix
  - backend reality: only `members.edit_role` grant controls it, and it is not hierarchical.
- Bible Study reschedule:
  - frontend assumption: reschedule route exists
  - backend reality: not implemented
- FS admin:
  - frontend assumption may suggest more FS admin screens than actual backend support
  - backend reality: FS routes exist but are limited.

## 17. FRONTEND ROLE VS BACKEND ROLE

| Frontend Role | Backend Role | Exact Match? | Notes |
|---|---|---:|---|
| Member | Member | Yes | Default role assigned on registration |
| President / Executive | President / Executive | Yes | Costly admin role in backend |
| General Secretary | General Secretary | Yes | backend permission owner for academic rollover |
| Publicity Coordinator | Publicity Coordinator | Yes | allowed for events/media/announcements |
| VP / FS Coordinator | VP / FS Coordinator | Yes | FS review permission |
| Bible Study Coordinator | Bible Study Coordinator | Yes | actual Bible Study create/publish role |
| Technical Administrator | Technical Administrator | Yes | backend admin role |
| FS Teacher | FS Teacher | Yes | seeded role |
| FS Student | FS Student | Yes | seeded role |
| Alumni | Alumni | Not a role assignment ID; membership status and academic level value only | Alumni exists as membershipStatus, not as a primary role |
| Financial Secretary | Financial Secretary | Yes | seeded but no direct route-specific permission found |
| Treasurer | Treasurer | Yes | seeded but no direct route-specific permission found |
| Librarian | Librarian | Yes | seeded but no direct route-specific permission found |
| Prayer Coordinator | Prayer Coordinator | Yes | seeded but no direct route-specific permission found |
| Drama Coordinator | Drama Coordinator | Yes | seeded but no direct route-specific permission found |
| Organizing Coordinator | Organizing Coordinator | Yes | seeded but no direct route-specific permission found |

### Important note
The backend does not validate frontend UI role names as a separate source of truth. The backend source of truth is the `roles` table and the permission matrix.

## 18. FRONTEND PERMISSION VS BACKEND AUTHORIZATION

| Frontend Permission | Backend Equivalent | Exact Match? | Backend Evidence |
|---|---|---:|---|
| `dashboard.view` | None found | No | no dashboard route or permission found |
| `members.view` | `members.view_directory` | Partial | route uses `members.view_directory` |
| `members.create` | None found | No | registration is public, not admin-only |
| `members.role` | `members.edit_role` | Partial | route patch uses `members.edit_role` |
| `members.status` | `members.edit_status` | Partial | route patch uses `members.edit_status` |
| `events.view` | none explicit; all events routes are auth-protected | No | route is auth-only, no dedicated permission |
| `events.create` | `events.create_edit` | Partial | route config |
| `events.update` | `events.create_edit` | Partial | route config |
| `events.cancel` | `events.create_edit` | Partial | route config |
| `announcements.view` | none explicit | No | route is auth-only, not permission keyed |
| `media.view` | no explicit permission; placements are public | No | placement read is public |
| `fs.students.view` | `fs.admissions.review` / `fs.students.record_completion` | Partial | route checks vary by action |
| `bible_study.create` | `bible_study.create` | Yes | explicit route permission |
| `bible_study.publish` | `bible_study.publish` | Yes | explicit route permission |
| `system.config.view` | `system.logs.view` | Partial | route checks use system logs permission |

### Conclusion
Many frontend permissions are not backend permissions. The backend uses a static, route-specific permission map rather than a broad frontend-style policy registry.

## 19. ADMIN CONSOLE CAPABILITY MATRIX

| Administrative Capability | Backend Exists? | Authentication | Authorized Roles | Authorized Permissions | Endpoint(s) | Production Ready? |
|---|---:|---|---|---|---|---|
| Dashboard data | No clear backend admin dashboard | ? | ? | ? | ? | No |
| Members | Yes | Yes | Members with directory access; privates for admin roles | `members.view_directory`, `members.view_private` | `/api/members`, `/api/members/:id` | Yes |
| Member role assignment | Yes | Yes | `President / Executive`, `Technical Administrator` | `members.edit_role` | `/api/members/:id/role` | Yes, but policy review needed |
| Member status | Yes | Yes | perm group | `members.edit_status` | `/api/members/:id/status` | Yes |
| Academic level | Yes | Yes | `General Secretary`, `President / Executive`, `Technical Administrator` | `academic.rollover` | `/api/members/:id/academic-level` | Yes |
| Password reset | Yes | Yes | `members.edit_status` roles | `members.edit_status` | `/api/members/:id/reset-password` | Yes |
| Subgroup | Yes | Yes | `Publicity Coordinator`, `President / Executive`, `Technical Administrator` | `members.edit_subgroup` | `/api/members/:id/subgroup` | Yes |
| Bible Study | Yes | Yes | `Bible Study Coordinator`, `President / Executive`, `Technical Administrator` | `bible_study.create`, `bible_study.publish` | `/api/bible-study` etc. | Yes |
| Events | Yes | Yes | `Publicity Coordinator`, `General Secretary`, `Technical Administrator` | `events.create_edit` | `/api/events` | Yes |
| Academic Sessions | Yes | Yes | `General Secretary`, `President / Executive`, `Technical Administrator` | `academic.rollover` | `/api/academic-sessions` | Yes |
| Media | Yes | Yes for uploads, no for reads | `Publicity Coordinator`, `President / Executive`, `Technical Administrator` | `media.upload` | `/api/media/*` | Yes |
| Departments | Yes | public / auth for create | role-edit users | `members.edit_role` | `/api/departments` | Partial |
| Foundational School | Yes | Yes | FS coordinators, exco, tech admin | `fs.admissions.review`, `fs.students.record_completion` | `/api/fs/*` | Yes |
| Announcements | Yes | Yes | `Publicity Coordinator`, `General Secretary`, `President / Executive`, `Technical Administrator` | `announcements.publish` | `/api/announcements` | Yes |
| Governance | Not implemented | ? | ? | `governance.approve` declared but unused | none | No |
| Leadership | Not implemented | ? | ? | none | none | No |
| Handover | Not implemented | ? | ? | none | none | No |
| System Health | Yes | Yes | `President / Executive`, `Technical Administrator` | `system.logs.view` | `/api/system/health`, `/api/system/pulse` | Yes |
| Technical Logs | Not implemented as general log viewer | ? | ? | `system.logs.view` only | limited health/pulse | Partial |
| System Configuration | Not implemented | ? | ? | none | none | No |
| Role Assignment | Yes | Yes | `President / Executive`, `Technical Administrator` | `members.edit_role` | `/api/members/:id/role` | Yes |
| Permission Management | Not implemented | ? | ? | none | none | No |
| Audit Logs | Not implemented | ? | ? | none | none | No |

## 20. SECURITY / AUTHORIZATION FINDINGS

### CRITICAL
- None found that is definitively exploitable from the code alone without additional operational data.
- The clearest policy-boundary concern is the lack of hierarchical restrictions when assigning roles through `/api/members/:id/role`.

### HIGH
- Role assignment is not protected against broader privilege escalation within the permission-granted group:
  - a user with `members.edit_role` can assign any existing role ID
  - there is no check preventing assignment of a higher role to another user
  - this is evidence-backed in [src/modules/members/members.service.ts](src/modules/members/members.service.ts) and [src/modules/members/members.repository.ts](src/modules/members/members.repository.ts)

### MEDIUM
- `members.edit_role` and `members.edit_status` are both routed through the same admin permission profile; it is not clear that the backend enforces role-based separation between them beyond the static config.
- There is no backend “reschedule” endpoint for Bible Study; a frontend version of that route is not implemented.
- Some strictly declared permissions exist but are unused (`governance.approve`, `fs.students.grade`)

### LOW
- Several UI/admin workflows likely exist only in the frontend, not in the backend.
- Some public read endpoints are not permission-gated despite being admin-adjacent.

### INFORMATIONAL
- The frontend localStorage/admin persona concept is not part of backend auth.
- Several frontend screens appear to represent mock or partial admin functionality that does not match backend modules.

## 21. BACKEND CAPABILITIES THAT DO NOT CURRENTLY EXIST

- Full governance / leadership / handover admin workflow
- Generic permission management UI or API
- Generic role CRUD admin screens
- Audit log viewer / system event history
- Backup / restore / maintenance mode
- Feature flag system
- Config editor for environment/system settings
- Dedicated “featured event” toggle or explicit featured flag management
- `PATCH /api/bible-study/:id/reschedule`
- Broad role hierarchy enforcement model
- End-to-end “Office-to-user assignment” authorization model

## 22. BACKEND CAPABILITIES NOT CURRENTLY EXPOSED BY FRONTEND

- `GET /api/academic-sessions/active`
- `GET /api/media/placements`
- `GET /api/media/placements/:key`
- `GET /api/departments`
- `POST /api/fs/manual`
- `POST /api/fs/students/bulk-graduate`
- `GET /api/system/pulse`
- `GET /api/content/website` public pages
- `GET /api/bible-study/current`
- `POST /api/bible-study/upload-outline`
- `POST /api/bible-study/series`
- `GET /api/bible-study/series/:id`

## 23. FINAL BACKEND AUTHORITY MAP

- AUTHENTICATION AUTHORITY:
  - Session cookie `asf_session` plus server-side session lookup and user load in [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts)
- ROLE AUTHORITY:
  - The `roles` table and `user_roles` join table are the backend source of truth; seed values are in [src/db/seeds/rolesSeed.ts](src/db/seeds/rolesSeed.ts)
- PERMISSION AUTHORITY:
  - [src/config/permissions.config.ts](src/config/permissions.config.ts) is the lookup table for all permission checks
- ADMIN ACCESS AUTHORITY:
  - route-level checks via `requirePermission(...)` and direct role existence in the database
- MEMBER MANAGEMENT AUTHORITY:
  - [src/modules/members/members.routes.ts](src/modules/members/members.routes.ts), [src/modules/members/members.controller.ts](src/modules/members/members.controller.ts), [src/modules/members/members.service.ts](src/modules/members/members.service.ts)
- BIBLE STUDY AUTHORITY:
  - [src/modules/bible-study/bibleStudy.routes.ts](src/modules/bible-study/bibleStudy.routes.ts) and [src/config/permissions.config.ts](src/config/permissions.config.ts)
- EVENT AUTHORITY:
  - [src/modules/events/events.routes.ts](src/modules/events/events.routes.ts) and [src/config/permissions.config.ts](src/config/permissions.config.ts)
- ACADEMIC SESSION AUTHORITY:
  - [src/modules/academic-session/academicSession.routes.ts](src/modules/academic-session/academicSession.routes.ts)
- MEDIA AUTHORITY:
  - [src/modules/media/media.routes.ts](src/modules/media/media.routes.ts)
- DEPARTMENT AUTHORITY:
  - [src/modules/departments/departments.routes.ts](src/modules/departments/departments.routes.ts)
- FS AUTHORITY:
  - [src/modules/fs/fsAdmissions.routes.ts](src/modules/fs/fsAdmissions.routes.ts), [src/modules/fs/fsStudents.routes.ts](src/modules/fs/fsStudents.routes.ts), [src/modules/fs/fsManual.routes.ts](src/modules/fs/fsManual.routes.ts)
- ROLE ASSIGNMENT AUTHORITY:
  - [src/modules/members/members.routes.ts](src/modules/members/members.routes.ts), [src/modules/members/members.service.ts](src/modules/members/members.service.ts), [src/modules/members/members.repository.ts](src/modules/members/members.repository.ts)
- SYSTEM ADMINISTRATION AUTHORITY:
  - limited to health/pulse and permission-protected system routes in [src/modules/system/system.routes.ts](src/modules/system/system.routes.ts)

## 24. FILES / SOURCE FILES INSPECTED

- [src/app.ts](src/app.ts)
- [src/config/permissions.config.ts](src/config/permissions.config.ts)
- [src/config/progressionRules.config.ts](src/config/progressionRules.config.ts)
- [src/db/schema/roles.ts](src/db/schema/roles.ts)
- [src/db/schema/userRoles.ts](src/db/schema/userRoles.ts)
- [src/db/schema/users.ts](src/db/schema/users.ts)
- [src/db/schema/events.ts](src/db/schema/events.ts)
- [src/db/seeds/rolesSeed.ts](src/db/seeds/rolesSeed.ts)
- [src/errors/appError.ts](src/errors/appError.ts)
- [src/middleware/errorHandler.ts](src/middleware/errorHandler.ts)
- [src/middleware/requireAuth.ts](src/middleware/requireAuth.ts)
- [src/middleware/requirePermission.ts](src/middleware/requirePermission.ts)
- [src/modules/auth/auth.controller.ts](src/modules/auth/auth.controller.ts)
- [src/modules/auth/auth.service.ts](src/modules/auth/auth.service.ts)
- [src/modules/auth/auth.repository.ts](src/modules/auth/auth.repository.ts)
- [src/modules/members/members.routes.ts](src/modules/members/members.routes.ts)
- [src/modules/members/members.controller.ts](src/modules/members/members.controller.ts)
- [src/modules/members/members.service.ts](src/modules/members/members.service.ts)
- [src/modules/members/members.repository.ts](src/modules/members/members.repository.ts)
- [src/modules/members/members.validation.ts](src/modules/members/members.validation.ts)
- [src/modules/academic-session/academicSession.routes.ts](src/modules/academic-session/academicSession.routes.ts)
- [src/modules/academic-session/academicSession.controller.ts](src/modules/academic-session/academicSession.controller.ts)
- [src/modules/academic-session/academicSession.service.ts](src/modules/academic-session/academicSession.service.ts)
- [src/modules/academic-session/academicSession.repository.ts](src/modules/academic-session/academicSession.repository.ts)
- [src/modules/academic-session/academicSession.validation.ts](src/modules/academic-session/academicSession.validation.ts)
- [src/modules/bible-study/bibleStudy.routes.ts](src/modules/bible-study/bibleStudy.routes.ts)
- [src/modules/bible-study/bibleStudy.controller.ts](src/modules/bible-study/bibleStudy.controller.ts)
- [src/modules/bible-study/bibleStudy.service.ts](src/modules/bible-study/bibleStudy.service.ts)
- [src/modules/bible-study/bibleStudy.validation.ts](src/modules/bible-study/bibleStudy.validation.ts)
- [src/modules/events/events.routes.ts](src/modules/events/events.routes.ts)
- [src/modules/events/events.controller.ts](src/modules/events/events.controller.ts)
- [src/modules/events/events.service.ts](src/modules/events/events.service.ts)
- [src/modules/events/events.repository.ts](src/modules/events/events.repository.ts)
- [src/modules/events/events.validation.ts](src/modules/events/events.validation.ts)
- [src/modules/media/media.routes.ts](src/modules/media/media.routes.ts)
- [src/modules/media/media.controller.ts](src/modules/media/media.controller.ts)
- [src/modules/media/media.service.ts](src/modules/media/media.service.ts)
- [src/modules/media/media.validation.ts](src/modules/media/media.validation.ts)
- [src/modules/fs/fsAdmissions.routes.ts](src/modules/fs/fsAdmissions.routes.ts)
- [src/modules/fs/fsAdmissions.controller.ts](src/modules/fs/fsAdmissions.controller.ts)
- [src/modules/fs/fsAdmissions.service.ts](src/modules/fs/fsAdmissions.service.ts)
- [src/modules/fs/fsStudents.routes.ts](src/modules/fs/fsStudents.routes.ts)
- [src/modules/fs/fsStudents.controller.ts](src/modules/fs/fsStudents.controller.ts)
- [src/modules/fs/fsStudents.service.ts](src/modules/fs/fsStudents.service.ts)
- [src/modules/fs/fsManual.routes.ts](src/modules/fs/fsManual.routes.ts)
- [src/modules/departments/departments.routes.ts](src/modules/departments/departments.routes.ts)
- [src/modules/departments/departments.controller.ts](src/modules/departments/departments.controller.ts)
- [src/modules/departments/departments.service.ts](src/modules/departments/departments.service.ts)
- [src/modules/departments/departments.validation.ts](src/modules/departments/departments.validation.ts)
- [src/modules/system/system.routes.ts](src/modules/system/system.routes.ts)
- [src/modules/cms/cms.routes.ts](src/modules/cms/cms.routes.ts)
- [tests/rbac.test.ts](tests/rbac.test.ts)
- [tests/events.test.ts](tests/events.test.ts)
- [tests/members.test.ts](tests/members.test.ts)
- [tests/bibleStudyThemeMedia.test.ts](tests/bibleStudyThemeMedia.test.ts)
- [tests/fs.test.ts](tests/fs.test.ts)
- [tests/announcements.test.ts](tests/announcements.test.ts)

## 25. CODE CHANGES
MUST BE: NONE
