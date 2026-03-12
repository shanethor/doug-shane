import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 12, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing or using the AURA Risk Group platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">AURA Risk Group provides a cloud-based insurance workflow platform including submission management, ACORD form processing, AI-powered data extraction, email correspondence management, pipeline tracking, and related tools for insurance professionals.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground">You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate and complete information during registration.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Interfere with or disrupt the Service's infrastructure</li>
              <li>Resell or redistribute the Service without authorization</li>
              <li>Submit false or misleading insurance information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground">The Service, including its design, features, and content, is owned by AURA Risk Group and protected by intellectual property laws. You retain ownership of data you upload but grant us a limited license to process it for providing the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. AI-Generated Content</h2>
            <p className="text-muted-foreground">Our Service uses artificial intelligence to assist with data extraction, form filling, and recommendations. AI-generated outputs are provided as suggestions only. You are solely responsible for reviewing, verifying, and approving all information before submission to carriers or other parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT AI-GENERATED CONTENT WILL BE ACCURATE OR COMPLETE.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">TO THE MAXIMUM EXTENT PERMITTED BY LAW, AURA RISK GROUP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO ERRORS IN AI-GENERATED CONTENT OR FORM DATA.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground">We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our discretion. Upon termination, you may request export of your data within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground">These Terms shall be governed by the laws of the State of New York, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground">We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground">For questions about these Terms, contact us at <a href="mailto:legal@aurariskgroup.net" className="text-primary underline">legal@aurariskgroup.net</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
