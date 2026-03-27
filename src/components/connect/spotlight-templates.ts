import { Heart, RefreshCw, UserPlus, Lightbulb, Calendar, Zap } from "lucide-react";

export interface SpotlightTemplate {
  id: string;
  name: string;
  tagline: string;
  contentType: string; // matches FLYER_TYPES value
  icon: typeof Heart;
  thumbnailBg: string; // HSL
  prompt: string;
  title: string;
  bullets: string[];
  cta: string;
  disclaimer: string;
}

export const SPOTLIGHT_TEMPLATES: SpotlightTemplate[] = [
  {
    id: "referral-ask",
    name: "Referral Ask",
    tagline: "Turn your network into your pipeline",
    contentType: "social",
    icon: Heart,
    thumbnailBg: "hsl(340 60% 45%)",
    prompt: "Create a warm, professional social media post asking my network to refer anyone who may need insurance coverage. The tone should be grateful and relationship-driven, not salesy. Mention that I make the process simple and that referrals mean a lot to my practice.",
    title: "Your Referral Means the World",
    bullets: [
      "I help individuals, families, and businesses get the right coverage",
      "Quick, no-pressure conversations — I do the heavy lifting",
      "Your referral means the world to my practice",
      "Happy to return the favor — let's connect",
    ],
    cta: "Send me a referral",
    disclaimer: "",
  },
  {
    id: "renewal-reminder",
    name: "Renewal Reminder",
    tagline: "Keep clients before someone else does",
    contentType: "announcement",
    icon: RefreshCw,
    thumbnailBg: "hsl(200 60% 42%)",
    prompt: "Create a professional announcement reminding clients that policy renewals are coming up. Emphasize the value of reviewing coverage annually, protecting against gaps, and that I am here to make the renewal process easy.",
    title: "It's Renewal Season — Let's Review Your Coverage",
    bullets: [
      "Coverage needs change — annual reviews catch gaps",
      "Rate shopping across carriers to get you the best value",
      "Renewals processed quickly with minimal paperwork",
      "Reach out now before your policy lapses",
    ],
    cta: "Schedule your review today",
    disclaimer: "Coverage subject to underwriting approval. Contact us for details.",
  },
  {
    id: "new-client-welcome",
    name: "New Client Welcome",
    tagline: "Celebrate the relationship from day one",
    contentType: "announcement",
    icon: UserPlus,
    thumbnailBg: "hsl(140 40% 38%)",
    prompt: "Create a warm welcome post celebrating a new client relationship. Express gratitude for their trust, briefly highlight the service experience they can expect, and invite their friends and family to reach out.",
    title: "Welcome Aboard — We're Proud to Protect You",
    bullets: [
      "Proud to protect another client and their family",
      "You can count on us for fast answers and real advocacy",
      "Coverage questions? We are always one call away",
      "Tell your friends — we would love to help them too",
    ],
    cta: "Welcome aboard",
    disclaimer: "",
  },
  {
    id: "risk-tip",
    name: "Risk Tip of the Week",
    tagline: "Educate your audience, build your authority",
    contentType: "educational",
    icon: Lightbulb,
    thumbnailBg: "hsl(45 70% 45%)",
    prompt: "Create an educational social media graphic with a risk management tip for business owners. Focus on one specific actionable tip related to liability, cyber security, commercial property, workers compensation, or business continuity. Position it as expert advice from a trusted insurance professional.",
    title: "Risk Tip: Is Your Cyber Coverage Enough?",
    bullets: [
      "Most business owners underestimate their cyber exposure",
      "One data breach can cost more than your annual premium",
      "Cyber liability insurance covers breach response costs",
      "Ask your agent to review your current cyber limits",
    ],
    cta: "Get a free coverage review",
    disclaimer: "For informational purposes only. Consult a licensed insurance professional.",
  },
  {
    id: "event-invite",
    name: "Event Invite",
    tagline: "Fill your next seminar, lunch, or mixer",
    contentType: "event",
    icon: Calendar,
    thumbnailBg: "hsl(270 45% 45%)",
    prompt: "Create a professional event invitation flyer for a business networking event or educational seminar hosted by an insurance professional. The tone should be inviting and professional with a clear RSVP call to action.",
    title: "You're Invited — Business Networking Event",
    bullets: [
      "Connect with local business owners and professionals",
      "Learn actionable strategies to protect your business",
      "Complimentary lunch and refreshments provided",
      "Limited spots available — reserve yours today",
    ],
    cta: "RSVP Now — Space Is Limited",
    disclaimer: "Event details subject to change. Contact us for accessibility accommodations.",
  },
  {
    id: "seasonal-promo",
    name: "Seasonal Promotion",
    tagline: "Drive urgency with a timely offer",
    contentType: "promotion",
    icon: Zap,
    thumbnailBg: "hsl(15 70% 48%)",
    prompt: "Create a promotional social media graphic for a seasonal insurance offer. Create urgency without being aggressive. Highlight the limited-time nature of the offer and a clear benefit of acting now.",
    title: "Limited Time — Lock In Your Rate Today",
    bullets: [
      "Rates are competitive right now — lock yours in before they change",
      "Quick 15-minute review could save you hundreds",
      "New carrier options available for your industry",
      "Limited-time offer — do not wait until renewal",
    ],
    cta: "Get a free quote today",
    disclaimer: "Offer subject to underwriting approval and eligibility requirements.",
  },
];
