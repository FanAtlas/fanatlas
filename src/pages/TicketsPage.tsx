import { useState } from "react";
import { Tab } from "../main";

type Ticket = {
  match: string;
  stadium: string;
  date: string;
  seat: string;
};

export function TicketsPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticket, setTicket] = useState<Ticket>({
    match: "",
    stadium: "",
    date: "",
    seat: ""
  });

  function saveTicket() {
    if (!ticket.match || !ticket.stadium) {
      alert("Add match and stadium.");
      return;
    }

    setTickets([...tickets, ticket]);

    setTicket({
      match: "",
      stadium: "",
      date: "",
      seat: ""
    });
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">My Tickets <span>2026</span></div>
          <div className="subtle">Save match, stadium, seat and QR screenshot</div>
        </div>
      </div>

      <div className="ticket-form">
        <input placeholder="Match: Morocco vs Spain" value={ticket.match} onChange={(e) => setTicket({ ...ticket, match: e.target.value })} />
        <input placeholder="Stadium" value={ticket.stadium} onChange={(e) => setTicket({ ...ticket, stadium: e.target.value })} />
        <input placeholder="Date" value={ticket.date} onChange={(e) => setTicket({ ...ticket, date: e.target.value })} />
        <input placeholder="Seat: Section / Row / Seat" value={ticket.seat} onChange={(e) => setTicket({ ...ticket, seat: e.target.value })} />

        <button className="primary-btn full-width" onClick={saveTicket}>
          Save Ticket
        </button>
      </div>

      <h3>Saved Tickets</h3>

      {tickets.length === 0 && (
        <div className="card-dark">
          <p className="subtle">No tickets saved yet.</p>
        </div>
      )}

      {tickets.map((t, index) => (
        <div className="ticket-card" key={index}>
          <h3>🎟 {t.match}</h3>
          <p>🏟 {t.stadium}</p>
          <p>📅 {t.date}</p>
          <p>💺 {t.seat}</p>

          <button className="primary-btn" onClick={() => setTab("matchday")}>
            Plan Match Day
          </button>
        </div>
      ))}
    </>
  );
}
