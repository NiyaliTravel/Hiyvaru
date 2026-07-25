// PLACEHOLDER — must be reviewed by a lawyer before pilot (see NEEDS_MOHAMED).
export default function PrivacyPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Privacy Policy (draft placeholder)</h1>
        <ul>
          <li><strong>Anonymity by design.</strong> You get a random display name. Listeners and staff never see your phone number, and it is never shown to other members.</li>
          <li><strong>One life-safety exception.</strong> If a trained listener or moderator confirms you may be in danger of suicide or self-harm, we will pass your contact details to the Maldives Police Service so they can check you are safe — while your listener stays with you. This is the only situation in which your contact leaves the platform. Your phone number is stored encrypted for exactly this purpose and for nothing else.</li>
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
