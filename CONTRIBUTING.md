# Contributing

## Purpose

Every contribution should improve accuracy, accessibility, privacy, or long-term maintainability.

## Workflow

1. Create a focused branch.
2. Make one logical change.
3. Test on mobile and desktop.
4. Update documentation when behavior changes.
5. Open a pull request.
6. Do not merge until the public tree still works.

## Naming

- Files and folders: lowercase with hyphens
- JavaScript variables: camelCase
- Database tables and columns: snake_case
- GEDCOM identifiers: preserve exactly as imported

## Security

Never commit:

- Supabase secret keys
- service-role keys
- database passwords
- access tokens
- private family submissions
- unprocessed GEDCOM files containing sensitive living-person data

## Pull-request checklist

- [ ] No secrets committed
- [ ] Living-relative privacy preserved
- [ ] Mobile layout tested
- [ ] Search tested
- [ ] Documentation updated
- [ ] Existing public tree still works
