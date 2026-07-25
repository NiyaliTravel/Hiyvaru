// PLACEHOLDER — must be reviewed by a lawyer before pilot (see NEEDS_MOHAMED).
export default function PrivacyPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Privacy Policy (draft placeholder)</h1>
        <ul>
          <li><strong>Anonymity by design.</strong> You get a random display name. Your phone number is stored only as an irreversible hash; your email is used only for account recovery.</li>
          <li><strong>We keep your birth year only</strong> — never your full date of birth.</li>
          <li><strong>Messages are encrypted at rest</strong> with a separate key per conversation.</li>
          <li><strong>"Delete my conversation" is real.</strong> It permanently destroys the messages and the encryption key. We cannot recover them, and neither can anyone else.</li>
          <li><strong>Moderators cannot read chats</strong> unless a crisis escalation or a report you file unlocks that specific conversation; every such view is logged.</li>
          <li><strong>Listener ID documents</strong> are encrypted, visible only to the admin, and permanently deleted the moment a verification decision is made.</li>
          <li><strong>No ads, no data sales, ever.</strong></li>
          <li>Data is hosted outside the Maldives.</li>
        </ul>
        <p className="hint">This draft will be replaced after legal review.</p>
      </div>
    </main>
  );
}
