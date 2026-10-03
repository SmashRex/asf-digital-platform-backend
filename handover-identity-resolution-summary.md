# Handover Identity Resolution

## CSV contract

Handover submissions now require exactly these headers, in this order:

```text
name,academicLevel,subgroup,office
```

`name` and `subgroup` are trimmed and matched case-insensitively. `academicLevel` is an exact value from the existing academic-level set. Subgroup input is canonicalized to the matching value from the nine canonical subgroup values after the case-insensitive check. Office names are trimmed and matched case-insensitively against the executive-office catalog. There is no fuzzy or partial matching. Members with a null subgroup cannot match.

## Resolution response

The submission response includes a `rows` array with one item per CSV row:

```json
{
  "name": "Sam Luke",
  "academicLevel": "300 Level",
  "subgroup": "Bible Study",
  "office": "Bible Study Coordinator",
  "result": "AMBIGUOUS",
  "candidates": [
    {
      "name": "Sam Luke",
      "academicLevel": "300 Level",
      "subgroup": "Bible Study",
      "department": "Computer Science"
    },
    {
      "name": "Sam Luke",
      "academicLevel": "300 Level",
      "subgroup": "Bible Study",
      "department": "Electrical Engineering"
    }
  ]
}
```

`result` is `VALID`, `AMBIGUOUS`, or `NOT_FOUND`. Candidates are included only for ambiguous rows and expose no email or member ID. The public `rows` array never includes member or office IDs. A submission is `Validated` only when every row resolves to one member and a known office; otherwise it remains a `Draft` and includes the relevant `validationErrors`.

## Storage and publication

Stored `parsedRows` retain the original human-readable fields plus resolved `memberId` and `officeId`. Unresolved IDs are stored as `null`. Approval and publication continue using resolved IDs, and publication's existing transactional office-transition behavior is unchanged.

Duplicate assignment, duplicate-member, office-cardinality, and president requirements still apply to resolved rows. Rows with unresolved identities cannot be approved or published.

## Verification review

The implementation was reviewed against the requested evidence and contract:

- `npx tsc --noEmit`: passed with no output.
- Focused handover suite: 5 tests passed.
- Named passing tests cover malformed/unknown/duplicate CSV rows, successful approval and publication, ambiguous and not-found resolution, office-name resolution, and publication rollback.
- `git diff --check`: passed with no output.

The first review identified two contract drifts, which were corrected:

1. Resolution results now use `VALID`, `AMBIGUOUS`, and `NOT_FOUND`.
2. Subgroup input is trimmed, compared case-insensitively, and canonicalized to the matching subgroup value. For example, `bible study` is returned as `Bible Study`.

Real API evidence for an ambiguous row returned two candidates with departments only:

```json
[
  {
    "name": "Evidence Sam 1790966352919",
    "academicLevel": "100 Level",
    "subgroup": "Bible Study",
    "office": "President",
    "result": "AMBIGUOUS",
    "candidates": [
      {
        "name": "Evidence Sam 1790966352919",
        "academicLevel": "100 Level",
        "subgroup": "Bible Study",
        "department": "Computer Science"
      },
      {
        "name": "Evidence Sam 1790966352919",
        "academicLevel": "100 Level",
        "subgroup": "Bible Study",
        "department": "Electrical Engineering"
      }
    ]
  }
]
```

Real API evidence for a unique match returned no member or office IDs:

```json
[
  {
    "name": "Evidence Unique 1790966352919",
    "academicLevel": "100 Level",
    "subgroup": "Bible Study",
    "office": "President",
    "result": "VALID"
  }
]
```

Public submission, get, list, approve, and publish responses omit stored `parsedRows`, so internal IDs remain available to the publication transaction without being exposed in the President workflow. Ambiguous and not-found drafts reject both approval and publication.

The working tree also contains unrelated CMS test/artifact changes: `tests/cms.test.ts`, CMS JSON backups, and `scripts/restore-website-draft.mjs`. These were not part of the handover implementation.

## Migration and policy review

The `src/db/schema/handovers.ts` diff is TypeScript-only:

```diff
- parsedRows: jsonb("parsed_rows").$type<{ memberId: string; officeId: string }[]>().notNull(),
+ parsedRows: jsonb("parsed_rows").$type<HandoverStoredRow[]>().notNull(),
```

No database column, constraint, index, or table changed. Running `npx drizzle-kit generate` reported:

```text
No schema changes, nothing to migrate
```

The lifecycle policy is **BLOCK**. Members must be `accountStatus = Active` and `membershipStatus = Active Student` during validation. Publication checks those statuses again inside the transaction. A member suspended or deactivated after validation causes publication to fail with `HANDOVER_MEMBER_INACTIVE`; the handover remains `Approved` and the transaction makes no assignment changes.

If a member is physically deleted after validation, the user foreign key on `user_executive_offices.user_id` is expected to reject publication and roll back the transaction. The current rollback test proves transactional failure for an invalid assignment, but there is not yet a dedicated validate-delete-publish test.

## Expanded edge-case verification

The handover test suite now has eight passing tests:

```text
✓ rejects malformed, unknown, and duplicate CSV assignments
✓ creates a reviewable handover, approves and publishes office transitions
✓ reports not-found and ambiguous identity matches without assigning either candidate
✓ resolves human-readable office names to their internal IDs
✓ uses conservative identity matching and blocks inactive members
✓ rejects unknown offices and case-variant duplicate member rows
✓ blocks publication when a validated member becomes inactive
✓ rolls publication back when a real assignment insert fails

Test Files  1 passed (1)
Tests       8 passed (8)
```

The expanded assertions now cover:

- null-subgroup members returning `NOT_FOUND`;
- partial names returning `NOT_FOUND`;
- trimmed, case-insensitive name matching;
- trimmed, case-insensitive subgroup canonicalization;
- unknown office rejection;
- duplicate-member detection after resolving case/spacing variants to the same member ID;
- renaming a member after approval without changing the published assignment target;
- blocking publication after a validated member becomes suspended;
- no member or office IDs in public rows or approval/publication responses.

The admin test helper reuses one session so the expanded suite does not trip the authentication rate limiter. The current source and test files remain available for direct inspection; the document is a summary, not a replacement for those files.

## Follow-up review and evidence

This section records the review requested after the initial summary. The implementation source is in:

- `src/modules/handover/handover.validation.ts`
- `src/modules/handover/handover.repository.ts`
- `src/modules/handover/handover.service.ts`
- `tests/handover.test.ts`

### Raw verification commands

Command:

```text
npx tsc --noEmit
```

Raw terminal result: no stdout or stderr; process exit code `0`.

Command:

```text
npx vitest run tests/handover.test.ts --reporter verbose
```

Raw named results:

```text
✓ rejects malformed, unknown, and duplicate CSV assignments
✓ creates a reviewable handover, approves and publishes office transitions
✓ reports not-found and ambiguous identity matches without assigning either candidate
✓ resolves human-readable office names to their internal IDs
✓ rolls publication back when a real assignment insert fails

Test Files  1 passed (1)
Tests       5 passed (5)
```

The exact current test file is `tests/handover.test.ts`; it should be inspected directly rather than relying on the five-test count.

### Edge-case coverage review

| Case | Current implementation | Committed assertion |
| --- | --- | --- |
| Member with `subgroup: null` | Cannot match because the repository requires `subgroup IS NOT NULL`. | Not currently asserted by a dedicated test. |
| Partial name such as `Sam` for `Sam Luke` | Does not match; repository comparison is trimmed, case-insensitive equality. | Not currently asserted by a dedicated test. |
| Name whitespace/case variants | Supported by `lower(trim(users.name))`. | Not currently asserted by a dedicated test. |
| Subgroup case/whitespace variants | Supported by schema trimming and case-insensitive canonicalization; output is canonical, such as `Bible Study`. | Verified by the real API evidence above, but not yet a dedicated committed test. |
| Unknown office name | Rejected with an `Unknown office` validation error; no fuzzy office repair occurs. | Not currently asserted by a dedicated test. |
| Same resolved member in rows differing by case/spacing | Canonical resolution produces the same member ID, then the resolved-ID duplicate/member checks reject it. | Current test covers an exact duplicate, not a case/spacing variant. |
| Approval/publication re-resolution | Not performed. Publication reads stored `parsedRows` IDs and passes them to the repository transaction. | Successful transition and rollback tests cover the stored-ID path indirectly; no mutation-between-stages test exists. |

### Member lifecycle between validation and publication

Deletion and deactivation behave differently:

- If the resolved member is deleted before publication, the `user_executive_offices.user_id` foreign key should reject the insert inside the transaction. The transaction rolls back, leaving the handover `Approved` and leaving assignments unchanged. This is consistent with the existing rollback test, but a specifically deleted-member test is not currently committed.
- If the member is only deactivated or suspended, publication currently does not check `accountStatus` or `membershipStatus`. The assignment can therefore still be inserted. This is an identified policy gap, not behavior that should be described as already protected.

### Frontend limitation

If two members share the same name, academic level, subgroup, and department, the returned candidates are intentionally indistinguishable because member IDs, masked IDs, and email addresses are excluded. The data must be corrected or one member must be renamed; the President workflow cannot safely choose between them.

### Cleanup and repository state

The evidence requests created real accounts using the `evidence-*` email prefix. The handover tests also create accounts using the `handover-*` prefix. No destructive cleanup was run automatically. Before cleanup, identify the exact rows and remove only the intended test accounts and any assignments created for them; do not delete by a broad name match.

Current `git status --short` output:

```text
 M src/db/schema/handovers.ts
 M src/modules/handover/handover.repository.ts
 M src/modules/handover/handover.service.ts
 M src/modules/handover/handover.validation.ts
 M tests/cms.test.ts
 M tests/handover.test.ts
?? cms-draft-after-restore.json
?? cms-draft-backup.json
?? cms-live-after-publish.json
?? cms-live-backup.json
?? handover-identity-resolution-summary.md
?? scripts/restore-website-draft.mjs
```

The CMS test and artifacts are unrelated to handover and should remain in a separate commit. The backup files contain CMS site configuration/content, including published and draft copy and section data; inspect them before committing and treat them as potentially sensitive repository artifacts.