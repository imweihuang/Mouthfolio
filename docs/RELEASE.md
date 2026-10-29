# Early-alpha source release

The first source release is the runnable synthetic client described in README.
The full company/filing journey and a hosted ASOF Data connection can follow as
separate work. A source release does not deploy a service or publish real research.

This is a maintainer procedure, not a record that publication has occurred.
Keep any private audit evidence outside this repository.

## Prepare the candidate

1. Select the exact commit and merge it through a reviewed PR with the required
   `CI passed` check, normal branch protections and an expected-head guard. Verify
   the resulting main revision; do not transfer acceptance to a changed candidate.
2. Review the complete history of every retained branch/tag, PR and issue text,
   review comments, releases, and all retained Actions logs/artifacts. A clean
   current tree or deletion in a later commit does not clear earlier exposure.
   Check for credentials, private source material, personal paths and unreviewed
   imports. Inspect author/committer names and email addresses, signed-off/co-author
   trailers, tag annotations and asset metadata as well as file contents. Use
   approved public attribution and a verified privacy-preserving commit address.
   A Git identity change affects future commits only; a passing secret scan does
   not establish that historical contact details are approved for publication.
   Preserve recovery evidence before any separately approved cleanup.
3. Confirm the import manifest, exact asset hashes, licenses and notices. Original
   code and synthetic examples use MIT; the font retains its OFL notice. ASOF Data,
   real source content and trademark rights are outside the source license.
4. Verify a fresh checkout without a private sibling, environment file or service
   credential. Run the README check/build/browser commands and the complete-history
   boundary check. Confirm synthetic labels, missing/error states and no external
   demo requests. Review the production output for private routes or data.
5. Keep README, contributor guidance, the security reporting route and the public
   roadmap accurate for the small alpha. The contract is pre-release. Retain
   `private: true` in package.json to prevent accidental npm publication.

## Separately authorized publication

Obtain explicit approval for the exact repository and reviewed candidate before
changing visibility. Review any new commits, comments or Actions output added
since the candidate check. Changing GitHub visibility is not authorized by a
successful build, a merged PR or this checklist.

As part of that approved publication:

- Verify the intended repository is public and the private data repository remains
  private. Re-read main-branch protection: required GitHub Actions `CI passed`,
  current-base checks, resolved conversations and administrator enforcement, with
  force pushes and branch deletion disabled.
- Verify public-fork workflow approval settings and keep read-only workflow
  permissions, standard hosted runners and credential-free contributor checks.
  Do not introduce a privileged pull-request workflow or private runner access.
- Enable and verify GitHub private vulnerability reporting when available for the
  public repository; confirm the route described in SECURITY.md. These public-only
  settings cannot be treated as verified while the repository is still private.
- Verify anonymous access and a fresh source checkout. Record the published
  revision and the checks performed. A release tag or announcement is optional
  and requires its own applicable authorization.

GitHub exposes retained Actions history and logs when a repository becomes public.
See [visibility consequences](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
and [private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
Standard public-repository runner compute is free; larger runners and storage have
separate rules in [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
