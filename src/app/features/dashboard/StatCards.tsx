import { STAT_CARDS } from "../../data/mock-data";

export function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {STAT_CARDS.map(card => (
        <div key={card.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm" style={{ borderTop: `3px solid ${card.color}` }}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-bold text-foreground leading-none">{card.value}</p>
                <p className="text-sm font-semibold text-gray-800 mt-2 leading-snug">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.period}</p>
              </div>
              <div className="p-2.5 rounded-lg flex-shrink-0" style={{ backgroundColor: card.bg, color: card.color }}>{card.icon}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border leading-relaxed">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
