export default function PrivacyPage() {
  return (
    <div className="prose mx-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
      <h1>TH_LifeEngine Privacy Policy</h1>
      <p><strong>Effective Date:</strong> 01 Nov 2025</p>

      <h2>Who We Are</h2>
      <p>
        This Privacy Policy describes how <strong>TH_LifeEngine</strong> ("we", "us", "our")
        processes personal data for the <strong>TH_LifeEngine Companion</strong> (Custom GPT)
        and our APIs at <code>https://th-life-engine.vercel.app</code>.
      </p>

      <h2>What We Collect</h2>
      <ul>
        <li><strong>Profile Inputs</strong>: name, age, gender, location, goals, plan_type,
          preferred_time, diet_type, activity_level, work_schedule, sleep_hours, stress_level,
          chronic_conditions, mental_state, has_equipment, language.</li>
        <li><strong>Generated Plans</strong>: structured wellness plans produced by the Custom GPT.</li>
        <li><strong>Technical Logs</strong>: timestamps, IP/country, user agent for reliability,
          security, and abuse prevention.</li>
      </ul>

      <h2>How We Use Data</h2>
      <ul>
        <li>Generate personalized plans via the Custom GPT.</li>
        <li>Store plans for review, analytics, and support.</li>
        <li>Maintain service reliability, prevent abuse, and troubleshoot issues.</li>
      </ul>

      <h2>What the Custom GPT Sends</h2>
      <p>
        The GPT may call: <code>GET /api/v1/profiles/&#123;id&#125;</code> to fetch a saved profile and
        <code> POST /api/v1/plans</code> to store the generated plan. No payment card data is collected.</p>

      <h2>Legal Basis</h2>
      <p>Consent and/or legitimate interests to deliver and improve the service.</p>

      <h2>Retention</h2>
      <p>Up to <strong>24 months</strong> unless deletion is requested earlier.</p>

      <h2>Sharing</h2>
      <p>No sale of personal data. Limited sharing with infrastructure/security providers under protection obligations.</p>

      <h2>Security</h2>
      <p>Encryption in transit, access controls, and audit logging. No system is 100% secure.</p>

      <h2>International Transfers</h2>
      <p>Data may be processed outside your country; safeguards applied consistent with law.</p>

      <h2>Your Rights</h2>
      <p>Access, correction, deletion, portability, restriction/objection, and withdraw consent where applicable.</p>

      <h2>Children</h2>
      <p>Not directed to children under 13.</p>

      <h2>Contact</h2>
      <p>Email: <a href="mailto:privacy@th-life-engine.example">privacy@th-life-engine.example</a></p>

      <h2>Changes</h2>
      <p>We may update this policy and post a new effective date.</p>
    </div>
  );
}
