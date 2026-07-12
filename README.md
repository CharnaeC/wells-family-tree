# Wells Family Legacy Archive

**Preserving Our Past. Connecting Our Future.**

The Wells Family Legacy Archive is a long-term digital family-history platform for preserving genealogy, photographs, stories, documents, timelines, and family contributions.

## Project owner

Charnae Carr

## Current architecture

- **MyHeritage** — source of truth for genealogy
- **GitHub Pages** — public website
- **Supabase** — authentication, database, storage, and permissions

## Current public features

- Searchable Wells family tree
- Nathaniel Wells and William Wells as founding branches
- Expandable descendant lines
- Living-relative privacy rules
- Profile-photo and initials support
- Profile popup foundation

## Version 1.0 goals

1. Secure administrator login
2. Repeatable GEDCOM import and update workflow
3. Supabase-powered people and relationships
4. Bulk photo upload and tagging
5. Person profiles with galleries, stories, documents, and timelines
6. Family contribution and approval workflow

## Important rule

Do not place any database password, secret key, service-role key, or access token in this repository.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [GEDCOM synchronization](docs/GEDCOM_SYNC.md)
- [Privacy policy](docs/PRIVACY.md)
- [Database design](docs/DATABASE.md)
- [Developer handoff](docs/DEVELOPER_HANDOFF.md)
- [Migration plan](docs/MIGRATION_PLAN.md)
