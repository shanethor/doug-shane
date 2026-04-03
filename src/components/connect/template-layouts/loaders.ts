import type { ComponentType } from "react";
import type { TemplateCanvasProps } from "../template-types";

type TemplateLayoutModule = {
  default: ComponentType<TemplateCanvasProps>;
};

const TEMPLATE_LAYOUT_LOADERS: Record<string, () => Promise<TemplateLayoutModule>> = {
  "referral-ask": () => import("./ReferralAskLayout"),
  "renewal-reminder": () => import("./RenewalReminderLayout"),
  "new-client-welcome": () => import("./NewClientWelcomeLayout"),
  "risk-tip": () => import("./RiskTipLayout"),
  "event-invite": () => import("./EventInviteLayout"),
  "seasonal-promo": () => import("./SeasonalPromoLayout"),
  "family-insurance-flyer": () => import("./FamilyInsuranceFlyerLayout"),
  "insurance-agency-service-flyer": () => import("./InsuranceAgencyServiceFlyerLayout"),
  "life-insurance-flyer-teal": () => import("./LifeInsuranceFlyerTealLayout"),
  "life-insurance-flyer-red": () => import("./LifeInsuranceFlyerRedLayout"),
  "financial-advisor-flyer-clean": () => import("./FinancialAdvisorFlyerCleanLayout"),
  "life-insurance-flyer-pink": () => import("./LifeInsuranceFlyerPinkLayout"),
  "financial-advisor-instagram-bw": () => import("./FinancialAdvisorInstagramBWLayout"),
  "financial-advisor-instagram-blue": () => import("./FinancialAdvisorInstagramBlueLayout"),
  "financial-advisor-instagram-green": () => import("./FinancialAdvisorInstagramGreenLayout"),
  "networking-steps-infographic": () => import("./NetworkingStepsInfographicLayout"),
  "newsletter-email-header": () => import("./NewsletterEmailHeaderLayout"),
  "business-newsletter-dark-blue": () => import("./BusinessNewsletterDarkBlueLayout"),
  "business-newsletter-grey": () => import("./BusinessNewsletterGreyLayout"),
  "business-newsletter-orange": () => import("./BusinessNewsletterOrangeLayout"),
  "networking-presentation-vibrant": () => import("./NetworkingPresentationVibrantLayout"),
  "referral-program-presentation": () => import("./ReferralProgramPresentationLayout"),
  "networking-presentation-blue": () => import("./NetworkingPresentationBlueLayout"),
  "networking-event-facebook": () => import("./NetworkingEventFacebookLayout"),
  "networking-event-linkedin": () => import("./NetworkingEventLinkedInLayout"),
  "networking-event-poster": () => import("./NetworkingEventPosterLayout"),
};

export function getTemplateLayoutLoader(templateId: string) {
  return TEMPLATE_LAYOUT_LOADERS[templateId] ?? TEMPLATE_LAYOUT_LOADERS["referral-ask"];
}