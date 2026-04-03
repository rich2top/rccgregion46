import Image from "next/image";

export function RccgMark({ compact = false }) {
  return (
    <div className={`rccg-lockup${compact ? " compact" : ""}`}>
      <div className={`logo-frame${compact ? " compact" : ""}`}>
        <Image
          src="/rccg-logo.png"
          alt="The Redeemed Christian Church of God logo"
          width={compact ? 36 : 148}
          height={compact ? 36 : 148}
          priority
        />
      </div>

      {compact ? null : (
        <div className="brand-panel-copy">
          <strong>The Redeemed Christian Church of God</strong>
          <span>Region 49 Quiz Portal</span>
        </div>
      )}
    </div>
  );
}
