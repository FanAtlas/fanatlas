import type { Tab } from "../main";

export function LegalFooter({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <footer className="footer-links legal-footer">
      <button type="button" onClick={() => setTab("privacy")}>Privacy Policy</button>
      <span>·</span>
      <button type="button" onClick={() => setTab("terms")}>Terms of Service</button>
      <span>·</span>
      <button type="button" onClick={() => setTab("support")}>Support</button>
    </footer>
  );
}
