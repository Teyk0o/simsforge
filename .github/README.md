# GitHub Configuration

This directory contains GitHub-specific configuration files and templates for the SimsForge project.

## Directory Structure

```
.github/
├── ISSUE_TEMPLATE/          # Issue templates
│   ├── bug_report.md        # Bug report template
│   ├── feature_request.md   # Feature request template
│   ├── question.md          # General question template
│   └── config.yml           # Issue template configuration
├── DISCUSSION_TEMPLATE/     # Discussion templates
│   ├── ideas.md             # Ideas discussion template
│   ├── announcements.md     # Announcements template
│   └── questions-and-answers.md  # Q&A template
├── workflows/               # GitHub Actions workflows
│   └── ci.yml               # CI/CD pipeline
├── CONTRIBUTING.md          # Contribution guidelines
├── SECURITY.md              # Security policy
├── CODEOWNERS               # Code ownership rules
├── dependabot.yml           # Dependabot configuration
├── pull_request_template.md # PR template
├── RELEASE_TEMPLATE.md      # Release notes template
├── COMMIT_CONVENTION.md     # Commit message conventions
└── README.md                # This file
```

## File Descriptions

### Issue Templates (`ISSUE_TEMPLATE/`)

When users create a new issue, they can choose from:

- **bug_report.md**: For reporting bugs
  - Includes environment details
  - Steps to reproduce
  - Error messages
  - Screenshots

- **feature_request.md**: For requesting new features
  - Use case explanation
  - Proposed solution
  - Impact analysis
  - Priority level

- **question.md**: For general questions
  - Context and background
  - What has been tried
  - Related documentation

- **config.yml**: Configuration for issue templates
  - Disables blank issues
  - Links to helpful resources

### Discussion Templates (`DISCUSSION_TEMPLATE/`)

For GitHub Discussions:

- **ideas.md**: Share and discuss ideas
- **announcements.md**: Announcements and updates
- **questions-and-answers.md**: Q&A discussions

### Workflows (`workflows/`)

- **ci.yml**: Continuous Integration
  - Runs linting on all changes
  - Executes test suite
  - Uploads coverage reports
  - Validates TypeScript compilation

### Configuration Files

- **CONTRIBUTING.md**: Comprehensive contribution guide
  - Setup instructions
  - Branching strategy
  - Coding standards
  - Testing requirements
  - Commit conventions
  - PR guidelines

- **SECURITY.md**: Security policy
  - How to report vulnerabilities
  - Security best practices
  - Input validation guidelines
  - CORS and authentication rules

- **CODEOWNERS**: Automatic review assignments
  - Defines code ownership
  - Triggers automatic reviewer assignment
  - Prevents unauthorized changes

- **dependabot.yml**: Automated dependency updates
  - Weekly dependency checks
  - Separate configuration per package
  - Auto-labeling of PRs

- **pull_request_template.md**: PR template
  - Guided PR creation
  - Checklist for completeness
  - Test plan section
  - Breaking changes documentation

- **RELEASE_TEMPLATE.md**: Release notes template
  - Features section
  - Bug fixes
  - Breaking changes
  - Installation instructions

- **COMMIT_CONVENTION.md**: Commit message guide
  - Conventional Commits format
  - Type definitions
  - Examples and patterns
  - Best practices

## How These Templates Are Used

### Issues

When a user clicks "New Issue":
1. They see a dropdown with available templates
2. They select the appropriate template
3. The template opens with pre-filled sections
4. They fill in the details
5. The issue is created with proper structure

### Pull Requests

When a user creates a PR:
1. The `pull_request_template.md` is automatically inserted
2. They fill in the sections
3. GitHub validates based on configured checks
4. Code reviews are assigned based on `CODEOWNERS`

### Discussions

Similar to issues, templates help structure discussions:
1. User selects template type
2. Template sections appear
3. User fills in details
4. Discussion is created with clear structure

### CI/CD

The `ci.yml` workflow:
1. Runs on every push and pull request
2. Installs dependencies
3. Runs linting checks
4. Executes test suite
5. Uploads coverage reports
6. Provides feedback on PR

### Dependencies

The `dependabot.yml` configuration:
1. Checks for updates weekly
2. Creates PRs for updates
3. Follows Conventional Commits
4. Adds appropriate labels
5. Requests reviews from maintainers

## Best Practices

### For Users Creating Issues

1. Choose the appropriate template
2. Provide all requested information
3. Include error messages and logs
4. Add screenshots for UI issues
5. Reference related issues

### For Contributors Creating PRs

1. Use the PR template
2. Fill out all sections
3. Link related issues
4. Ensure tests pass
5. Request review from code owners

### For Maintainers

1. Review templates regularly
2. Update as project evolves
3. Monitor dependency updates
4. Enforce coding standards
5. Provide timely feedback

## Customization

To modify templates:

1. Edit the relevant file in this directory
2. Changes apply to new issues/PRs immediately
3. Update documentation in corresponding markdown files
4. Create a PR with the template changes

## References

- [GitHub Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)
- [GitHub Discussion Templates](https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions)
- [GitHub Workflows](https://docs.github.com/en/actions/using-workflows)
- [GitHub CodeOwners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)

---

For questions or suggestions about these templates, please open an issue or discussion!
