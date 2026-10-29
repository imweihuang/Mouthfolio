# Security

## Reporting a vulnerability

Use GitHub's **Security → Advisories → Report a vulnerability** for this repository
when private reporting is available. Do not put credentials, exploit details or
private data in public issues, discussions or pull requests. If private reporting
is unavailable, open an issue asking only for a private contact route and wait for
the maintainer to provide one before sharing sensitive details.

Include the affected revision, impact and a minimal reproduction using synthetic
data. Do not test against another user's account or a live service without its
owner's permission. This alpha has no published response-time or supported-release
commitment; reports should identify whether the issue affects current `main`.

## Client boundary

This repository contains a local synthetic research demo, consumer validation,
an unconnected service adapter and development/publication tooling. It does not
contain the private ASOF Data service. Service responses, source links and
contributions must be treated as untrusted inputs.

Browser-delivered code must contain no service credentials or private source
material. A future service must enforce access and display rights before returning
data; client validation is an additional check. Missing, revoked and unavailable
evidence must remain explicit. Invalid responses must not become valid research.

Report broken boundaries, unsafe rendering or links, leaked sensitive material,
and bypasses of the documented publication controls. Local Git hooks and pattern
scans are mistake-prevention measures; they are bypassable and do not establish
that arbitrary business information is safe to publish. Review findings against
their actual reachability and impact. These limits are not exclusions from review.
