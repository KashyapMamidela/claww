// The site's last word: where to go next, how to reach us, and the legal pages.

export function SiteFooter({ instagram, onJoin }: { instagram: string; onJoin: () => void }) {
  return (
    <footer className="site-foot">
      <div className="sf-top">
        <div className="sf-brand">
          <a className="brand" href="#top" aria-label="CLAWW home">
            <img className="mark" src="/claww-mark.png" alt="" width={30} height={28} />
            <span>CLAWW</span>
          </a>
          <p>One app for your workouts, food, steps and sleep. Coming to Android and iOS.</p>
          <button type="button" className="top-cta sf-join" onClick={onJoin}>
            Join the waitlist
          </button>
        </div>

        <nav className="sf-cols" aria-label="Footer">
          <div>
            <h3>Explore</h3>
            <ul>
              <li>
                <a href="#features">Workouts</a>
              </li>
              <li>
                <a href="#day">Food, steps and sleep</a>
              </li>
              <li>
                <a href="#tracker">The CLAWW Tracker</a>
              </li>
              <li>
                <a href="#why">Why CLAWW</a>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li>
                <a href={instagram} target="_blank" rel="noopener noreferrer">
                  Instagram @clawwcrew
                </a>
              </li>
              <li>
                <a href="mailto:support@claww.me">Help: support@claww.me</a>
              </li>
              <li>
                <a href="mailto:privacy@claww.me">Privacy: privacy@claww.me</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Legal</h3>
            <ul>
              <li>
                <a href="/privacy">Privacy policy</a>
              </li>
              <li>
                <a href="/terms">Terms of use</a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <p className="sf-disclaimer">
        CLAWW gives general fitness and nutrition guidance, not medical advice. Talk to a doctor before starting a new programme if you have an injury or a health
        condition.
      </p>

      <div className="sf-bottom">
        <span>&copy; 2026 CLAWW</span>
        <span>Made in India, for everyone who wants to get fit.</span>
      </div>
    </footer>
  );
}
