# Documentation currency policy

Documentation is an engineering deliverable and must be updated in the same change as the behaviour it describes.

## Mandatory updates

Update the relevant documentation whenever a change affects user-visible behaviour, APIs, configuration, hardware support, safety behaviour, deployment, data formats, tests, workflows, or frontend architecture. Update `MASTER_CONTEXT.md` whenever architecture, project boundaries, operating conventions, or validation status changes.

## Status language

Documentation must distinguish implemented, automated-test verified, bench-tested, production-validated, and planned or unverified behaviour. Code existence alone must never be described as bench-tested or production-validated.

## Enforcement

Run `python tests/test_documentation.py` from the repository root. The audit checks required maintained documents, current-state status sections, status vocabulary, and references to scripts, configuration, examples, and frontend artefacts. The pull-request classifier `tests/documentation_change_policy.py` applies the maintainable rules in `tests/documentation_change_policy.json` to changed files. A classified behaviour-affecting change must include a documentation file. Intentional exemptions are listed in that JSON file with their reasons. Both checks run in CI and must pass before a change is accepted.
