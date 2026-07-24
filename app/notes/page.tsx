// Neutral decoy page for the panic button. Deliberately unbranded and boring:
// looks like a generic notes app. No links back to Hiyvaru.
export const metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h2 style={{ fontWeight: 600 }}>Notes</h2>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBlock: 8 }}>
        <strong>Shopping</strong>
        <ul style={{ margin: "6px 0 0", color: "#444" }}>
          <li>Rice</li>
          <li>Tea</li>
          <li>Dish soap</li>
        </ul>
      </div>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBlock: 8 }}>
        <strong>To do</strong>
        <ul style={{ margin: "6px 0 0", color: "#444" }}>
          <li>Call the electrician</li>
          <li>Pick up laundry</li>
        </ul>
      </div>
    </main>
  );
}
