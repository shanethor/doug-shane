import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 12, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">AURA Risk Group ("we," "us," or "our") operates the buildingaura.site platform and related services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground"><strong className="text-foreground">Account Information:</strong> Name, email address, phone number, and agency details provided during registration.</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Business Data:</strong> Insurance applications, submission documents, policy details, loss runs, and related business information uploaded or entered into the platform.</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Email & Calendar Data:</strong> When you connect email or calendar accounts, we sync message metadata, subjects, and body content solely to provide our correspondence management features.</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Usage Data:</strong> Log data, device information, IP addresses, and interaction patterns to improve our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide, operate, and maintain the AURA platform</li>
              <li>Process insurance submissions and auto-fill ACORD forms</li>
              <li>Facilitate email correspondence and calendar scheduling</li>
              <li>Generate AI-powered insights and recommendations</li>
              <li>Send transactional notifications and platform updates</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground">We employ industry-standard security measures including AES-256-GCM encryption for OAuth tokens at rest, TLS encryption in transit, and role-based access controls. We conduct regular security reviews and follow best practices for data protection.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Service providers that help operate our platform (hosting, AI processing)</li>
              <li>Insurance carriers and partners as directed by you during submissions</li>
              <li>Law enforcement when required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground">We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground">Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal data. To exercise these rights, contact us at <a href="mailto:privacy@aurariskgroup.net" className="text-primary underline">privacy@aurariskgroup.net</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a revised "Last updated" date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground">If you have questions about this Privacy Policy, please contact us at <a href="mailto:privacy@aurariskgroup.net" className="text-primary underline">privacy@aurariskgroup.net</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
