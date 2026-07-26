# Security Policy

Hiyvaru handles some of the most sensitive data a person can share. Please
treat security issues here with more care than a typical open-source project.

## Reporting a vulnerability

**Do not open a public issue.** If you find anything that could:

- deanonymise a member or link them to a phone number,
- expose chat content to anyone other than the two participants,
- break the crisis-escalation flow or the 16+ age gate,
- allow an unverified listener to take a chat,
- or recover a "permanently deleted" conversation,

please report it privately to the maintainer via the email on the
[NiyaliTravel GitHub profile](https://github.com/NiyaliTravel), with
"HIYVARU SECURITY" in the subject.

Please include what you found, how to reproduce it, and what you think the
impact is. You'll get an acknowledgement within a few days.

## Scope

In scope: this repository and any deployed Hiyvaru instance.
Out of scope: the third-party services we depend on (Twilio, the host, etc.) —
report those to the vendor.

## What we ask of you

- Test only against your own local instance or your own accounts.
- Never access, modify, or retain another person's data.
- Give us reasonable time to fix an issue before disclosing it.

## Secrets

No secret has ever been committed to this repository — `.env` is ignored and
`.env.example` contains blank placeholders only. If you ever spot a real
credential in the tree or in history, treat it as a vulnerability and report
it privately using the process above.

Keys that must be unique per deployment and never shared:
`MESSAGE_MASTER_KEY`, `ID_DOC_MASTER_KEY`, `CONTACT_MASTER_KEY`,
`PHONE_HASH_SECRET`, plus Twilio and VAPID credentials.

Rotating `MESSAGE_MASTER_KEY` makes existing chats undecryptable, and rotating
`PHONE_HASH_SECRET` breaks existing logins — plan those carefully.
