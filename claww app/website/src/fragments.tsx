// Small pieces of the real app, drawn the way they look in the app (dark, Inter),
// one per chapter. `data-moment` marks the part that animates when the plate lands.

export function PrescriptionFragment() {
  return (
    <figure className="fragment" aria-label="In the app: today's prescription for bench press">
      <div className="frag-row">
        <span className="frag-title">Barbell Bench Press</span>
        <span className="pill pill-green" data-moment>
          Weight up
        </span>
      </div>
      <div className="frag-big">62.5 kg · 6 reps × 3 sets</div>
      <div className="frag-why">You did 60 kg for 10 reps, two sessions in a row. Time for more.</div>
    </figure>
  );
}

const MUSCLES: [string, number, string][] = [
  ['Back', 96, 'Excellent'],
  ['Chest', 65, 'Moderate'],
  ['Triceps', 44, 'Low'],
];

export function MuscleFragment() {
  return (
    <figure className="fragment" aria-label="In the app: muscle recovery scores">
      {MUSCLES.map(([m, s, band]) => (
        <div className="frag-meter" key={m}>
          <div className="frag-row">
            <span className="frag-title">{m}</span>
            <span className="frag-score">
              {s} <span className="frag-dim">{band}</span>
            </span>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${s}%` }} data-moment="fill" />
          </div>
        </div>
      ))}
      <div className="frag-why">Chest stays at 60 kg today. Triceps gets one set fewer.</div>
    </figure>
  );
}

export function SetFragment() {
  return (
    <figure className="fragment" aria-label="In the app: logging a set with one tap">
      <div className="set-head">
        <span>Set</span>
        <span>Last</span>
        <span>kg</span>
        <span>Reps</span>
        <span />
      </div>
      <div className="set-row done">
        <span>1</span>
        <span className="frag-dim">60×10</span>
        <span>62.5</span>
        <span>6</span>
        <span className="tick" data-moment>
          ✓
        </span>
      </div>
      <div className="set-row now">
        <span>2</span>
        <span className="frag-dim">60×10</span>
        <span>62.5</span>
        <span>6</span>
        <span className="tick empty" />
      </div>
      <div className="done-btn">Done · 6 × 62.5 kg</div>
    </figure>
  );
}

export function MealFragment() {
  return (
    <figure className="fragment" aria-label="In the app: a suggested breakfast">
      <div className="frag-row">
        <span className="frag-title">Paneer besan chilla, mint chutney</span>
        <span className="pill pill-green" data-moment>
          Best fit
        </span>
      </div>
      <div className="macros">
        <span>520 kcal</span>
        <span className="green">34 g protein</span>
        <span className="frag-dim">48 g carbs</span>
        <span className="frag-dim">15 min</span>
      </div>
      <div className="frag-why">A quarter of the protein you still need today.</div>
    </figure>
  );
}
