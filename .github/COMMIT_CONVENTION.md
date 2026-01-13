# Commit Convention

SimsForge follows the **Conventional Commits** specification for all commit messages.

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, missing semicolons, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process, dependencies, tooling, or other changes that don't modify source code or test files

## Scope

Optional but recommended. The scope should specify what part of the codebase is being modified:

**Backend scopes**:
- auth
- users
- mods
- creators
- curseforge
- database
- api
- config

**Frontend scopes**:
- ui
- components
- auth
- dashboard
- mods
- settings
- tauri

**General scopes**:
- ci
- deps
- docs
- config

## Description

The description must:
- Use the imperative, present tense: "change" not "changed" nor "changes"
- Not capitalize the first letter
- Not have a period (.) at the end
- Be concise but descriptive (50-72 characters recommended)

## Body

Optional but helpful for:
- Explaining the motivation for the change
- Describing what was changed and why
- Providing context about the solution

The body must:
- Begin after a blank line after the description
- Wrap at 100 characters
- Explain WHAT and WHY, not HOW

## Footer

Optional. Use for:
- Breaking changes: Start with `BREAKING CHANGE:`
- Issue references: `Closes #123`, `Fixes #456`, `Related to #789`

## Examples

### Simple fix
```
fix(auth): prevent token expiry on successful refresh

The token refresh endpoint was not updating the token expiration time.
```

### New feature
```
feat(mods): add mod search filters

Allow users to filter mods by category, author, and popularity.
Implements #234
```

### Breaking change
```
feat(api): change mod endpoint response format

BREAKING CHANGE: The mod endpoint now returns camelCase field names instead of snake_case.
Users will need to update their API integration code.

Closes #567
```

### Multiple lines
```
refactor(auth): simplify token validation logic

- Extract token validation into separate service
- Reduce code duplication in middleware
- Improve test coverage for edge cases

This refactoring makes the codebase more maintainable and testable.
```

### With scope and related issues
```
fix(database): correct migration for user preferences

The migration had incorrect column types that caused data loss
on systems with certain default configurations.

Fixes #890
Related to #891
```

## Common Patterns

### Dependabot / Automated updates
```
chore(deps): upgrade express from 4.17.1 to 4.18.2

Dependencies have been automatically updated via Dependabot.
```

### Documentation
```
docs: add API authentication examples
```

### Configuration
```
chore(config): update eslint rules for ts files
```

### Multiple changes in one commit (keep atomic!)
```
feat(auth): add password reset functionality

- Add password reset endpoint
- Add email verification
- Implement token expiration

Closes #200
```

## Tips

1. **Be descriptive**: Help future developers understand why the change was made
2. **Keep it atomic**: One logical change per commit
3. **Reference issues**: Link to GitHub issues when applicable
4. **Use lowercase**: Type and scope should be lowercase
5. **No period at end**: Description should not end with punctuation
6. **Explain the why**: Not just what the code does, but why it matters

## Tools

### Commitizen

You can use Commitizen to ensure proper formatting:

```bash
npm install -g commitizen cz-conventional-changelog
cz commit
```

### Husky + Commitlint

The project can be configured with Husky and Commitlint to enforce conventions:

```bash
npm install husky commitlint @commitlint/config-conventional --save-dev
```

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines)
- [Semantic Versioning](https://semver.org/)
