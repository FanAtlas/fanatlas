import { useEffect, useState } from "react";
import { FileText, Image, QrCode, Ticket as TicketIcon } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { Tab } from "../main";
import { FanAtlasMatch } from "../services/worldcup2026";
import { reminderDate, scheduleNotification } from "../services/notifications";

type Ticket = {
  id: string;
  match: string;
  stadium: string;
  city: string;
  date: string;
  time: string;
  seat: string;
  pdfName: string;
  screenshotName: string;
  qrName: string;
  qrPreview: string;
};

type DraftTicket = Omit<Ticket, "id">;

type TicketsPageProps = {
  onBack: () => void;
  setSelectedMatch: (match: FanAtlasMatch) => void;
  setTab: (tab: Tab) => void;
};

const STORAGE_KEY = "fanatlas.tickets";

const emptyTicket: DraftTicket = {
  match: "",
  stadium: "",
  city: "",
  date: "",
  time: "",
  seat: "",
  pdfName: "",
  screenshotName: "",
  qrName: "",
  qrPreview: ""
};

function loadTickets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed as Ticket[] : [];
  } catch {
    return [];
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ticketToMatch(ticket: Ticket): FanAtlasMatch {
  const [team1, team2] = ticket.match.includes(" vs ")
    ? ticket.match.split(" vs ")
    : [ticket.match, "Opponent"];

  return {
    id: ticket.id,
    matchNumber: 0,
    homeTeam: team1,
    awayTeam: team2,
    team1,
    team2,
    group: "",
    stage: "Ticket",
    stadium: ticket.stadium,
    city: ticket.city || "Host City",
    country: "",
    date: ticket.date || "Match date",
    kickoffTime: ticket.time || "Kickoff time",
    time: ticket.time || "Kickoff time",
    status: "Upcoming",
    homeScore: null,
    awayScore: null,
    fanZone: "Nearby Fan Zone"
  };
}

export function TicketsPage({ onBack, setSelectedMatch, setTab }: TicketsPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>(() => loadTickets());
  const [ticket, setTicket] = useState<DraftTicket>(emptyTicket);
  const [error, setError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }, [tickets]);

  function updateTicket(field: keyof DraftTicket, value: string) {
    setTicket((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleFile(field: "pdfName" | "screenshotName" | "qrName", file: File | undefined) {
    if (!file) return;

    if (field === "qrName") {
      updateTicket("qrPreview", await fileToDataUrl(file));
    }

    updateTicket(field, file.name);
  }

  function saveTicket() {
    if (!ticket.match || !ticket.stadium || !ticket.seat) {
      setError("Save match, stadium, and seat before adding the ticket.");
      return;
    }

    setTickets((current) => [
      ...current,
      {
        ...ticket,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
    ]);

    setTicket(emptyTicket);
    setError("");
  }

  function planMatchDay(savedTicket: Ticket) {
    setSelectedMatch(ticketToMatch(savedTicket));
    setTab("matchday");
  }

  async function addTicketReminder(savedTicket: Ticket) {
    const { permission } = await scheduleNotification({
      type: "ticket",
      title: `Ticket reminder: ${savedTicket.match}`,
      message: `Seat ${savedTicket.seat} at ${savedTicket.stadium}. Keep PDF, screenshot, and QR saved offline.`,
      dueAt: reminderDate(180),
      source: "My Tickets",
      actionTab: "tickets"
    });

    setNotificationMessage(
      permission === "denied"
        ? "Ticket reminder saved in FanAtlas. Browser notifications are blocked."
        : `Ticket reminder saved for ${savedTicket.match}.`
    );
  }

  return (
    <>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">
            My Tickets <span>2026</span>
          </div>
          <div className="subtle">
            Upload PDF, screenshot, QR, seat and match details
          </div>
        </div>
      </div>

      <div className="ticket-form upgraded">
        <input
          className="input"
          placeholder="Match: Morocco vs Spain"
          value={ticket.match}
          onChange={(e) => updateTicket("match", e.target.value)}
        />

        <div className="grid-2">
          <input
            className="input"
            placeholder="Stadium"
            value={ticket.stadium}
            onChange={(e) => updateTicket("stadium", e.target.value)}
          />
          <input
            className="input"
            placeholder="City"
            value={ticket.city}
            onChange={(e) => updateTicket("city", e.target.value)}
          />
        </div>

        <div className="grid-2">
          <input
            className="input"
            placeholder="Date"
            value={ticket.date}
            onChange={(e) => updateTicket("date", e.target.value)}
          />
          <input
            className="input"
            placeholder="Kickoff time"
            value={ticket.time}
            onChange={(e) => updateTicket("time", e.target.value)}
          />
        </div>

        <input
          className="input"
          placeholder="Seat: Section / Row / Seat"
          value={ticket.seat}
          onChange={(e) => updateTicket("seat", e.target.value)}
        />

        <div className="ticket-upload-grid">
          <label>
            <FileText size={18} />
            Upload PDF
            <input type="file" accept="application/pdf" onChange={(e) => handleFile("pdfName", e.target.files?.[0])} />
            <small>{ticket.pdfName || "No PDF selected"}</small>
          </label>

          <label>
            <Image size={18} />
            Upload Screenshot
            <input type="file" accept="image/*" onChange={(e) => handleFile("screenshotName", e.target.files?.[0])} />
            <small>{ticket.screenshotName || "No screenshot selected"}</small>
          </label>

          <label>
            <QrCode size={18} />
            Save QR
            <input type="file" accept="image/*" onChange={(e) => handleFile("qrName", e.target.files?.[0])} />
            <small>{ticket.qrName || "No QR selected"}</small>
          </label>
        </div>

        {error && <div className="route-status error">{error}</div>}

        <button className="primary-btn full-width" onClick={saveTicket}>
          Save Ticket
        </button>
      </div>

      <h3>Saved Tickets</h3>

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}

      {tickets.length === 0 && (
        <div className="card-dark">
          <p className="subtle">No tickets saved yet.</p>
        </div>
      )}

      <div className="ticket-card-list">
        {tickets.map((savedTicket) => (
          <div className="ticket-card upgraded" key={savedTicket.id}>
            <div className="ticket-card-top">
              <div className="ticket-icon"><TicketIcon size={22} /></div>
              <div>
                <h3>{savedTicket.match}</h3>
                <p>{savedTicket.date} · {savedTicket.time || "Time TBD"}</p>
              </div>
            </div>

            <div className="ticket-meta-grid">
              <span>🏟 {savedTicket.stadium}</span>
              <span>📍 {savedTicket.city || "Host City"}</span>
              <span>💺 {savedTicket.seat}</span>
              <span>📄 {savedTicket.pdfName || "PDF not uploaded"}</span>
              <span>🖼 {savedTicket.screenshotName || "Screenshot not uploaded"}</span>
              <span>🔳 {savedTicket.qrName || "QR not uploaded"}</span>
            </div>

            {savedTicket.qrPreview && (
              <img className="ticket-qr-preview" src={savedTicket.qrPreview} alt={`${savedTicket.match} QR code`} />
            )}

            <button
              className="primary-btn full-width"
              onClick={() => planMatchDay(savedTicket)}
            >
              Connect to Match Day
            </button>

            <button
              className="secondary-btn full-width"
              onClick={() => addTicketReminder(savedTicket)}
            >
              Add ticket reminder
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
