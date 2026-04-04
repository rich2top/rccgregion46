import Link from "next/link";
import { PageShell } from "@/components/page-shell";

const highlights = [
  {
    title: "Participant Registration",
    description:
      "Each participant completes biodata first before moving into the quiz instructions.",
  },
  {
    title: "Timed Quiz Session",
    description:
      "The countdown continues correctly after refresh and submits automatically when time runs out.",
  },
  {
    title: "Final Score Review",
    description:
      "Once the quiz is submitted, the participant can view the score and review all selections.",
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <section className="landing-shell">
        <div className="card landing-card">
          <span className="section-tag">2026 Regional Quiz</span>
          <p className="hero-kicker">RCCG Region 46</p>
          <h1>Welcome to the RCCG Region 46 Regional Quiz Portal.</h1>
          <p className="landing-copy">
            Complete participant biodata, read the quiz instructions carefully, and
            proceed into the timed quiz session.
          </p>

          <div className="hero-actions">
            <Link href="/biodata" className="primary-button">
              Get Started
            </Link>
          </div>
        </div>

        <div className="landing-metrics">
          {highlights.map((item) => (
            <div key={item.title} className="metric-card card">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
