// Questions people actually ask before joining a waitlist. Native <details>, so it works
// with a keyboard and a screen reader and without JavaScript; one open at a time.

const FAQ: [string, React.ReactNode][] = [
  [
    'When does CLAWW launch?',
    <>
      Android comes first, then iOS. We don&rsquo;t want to promise a date we can&rsquo;t keep, so join the waitlist and we&rsquo;ll email you once, on the day
      it&rsquo;s ready for your phone.
    </>,
  ],
  [
    'Is CLAWW free?',
    <>Pricing isn&rsquo;t final yet. People on the waitlist will hear about it first, before anyone else.</>,
  ],
  [
    'Do I need a gym?',
    <>
      No. Tell CLAWW what you have, whether that&rsquo;s a full gym, some equipment at home or just your own bodyweight, and it plans around it. Yoga and mobility
      sessions need nothing but a mat.
    </>,
  ],
  [
    'I’m a complete beginner. Is it for me?',
    <>
      Yes. You pick your experience level when you start, and every exercise comes with simple step-by-step form cues. CLAWW starts you light and only adds more
      when you&rsquo;re ready.
    </>,
  ],
  [
    'How does counting calories from a photo work?',
    <>
      Take a photo of your plate, or type what you ate. CLAWW estimates the calories, protein, carbs and fat, and you can fix anything before saving. It&rsquo;s an
      estimate, not a lab measurement, but it&rsquo;s close enough to keep you on track without weighing every meal.
    </>,
  ],
  [
    'Does it work with my watch or other apps?',
    <>
      On Android, CLAWW can read your steps and active calories from Health Connect, which collects data from many watches and fitness apps. Without it, your
      phone counts your steps on its own.
    </>,
  ],
  [
    'Is my data safe?',
    <>
      Your data is tied to your account and only you can see it. Meal photos are private. We never sell your data, and you can delete your account and
      everything in it from the app at any time. Read the <a href="/privacy">privacy policy</a> for the details.
    </>,
  ],
  [
    'Is CLAWW medical advice?',
    <>
      No. CLAWW gives general fitness and nutrition guidance. If you have an injury or a health condition, talk to a doctor before starting a new programme.
    </>,
  ],
  [
    'How do I leave the waitlist?',
    <>
      Reply &ldquo;remove&rdquo; to the email we sent you, or write to <a href="mailto:clawwapp@zohomail.in">clawwapp@zohomail.in</a>. We&rsquo;ll take you off the
      list.
    </>,
  ],
];

export function Faq() {
  return (
    <section className="w-block faq" id="faq" aria-labelledby="faq-h">
      <div className="w-copy">
        <h2 id="faq-h">Questions, answered.</h2>
        <p className="w-body">
          Anything else? Write to <a href="mailto:clawwapp@zohomail.in">clawwapp@zohomail.in</a> or message us on Instagram.
        </p>
      </div>
      <div className="faq-list">
        {FAQ.map(([q, a]) => (
          <details key={q} name="faq" className="faq-item">
            <summary>
              <span>{q}</span>
              <span className="faq-icon" aria-hidden />
            </summary>
            <div className="faq-a">
              <p>{a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
