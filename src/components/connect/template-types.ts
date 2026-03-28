// Shared types for template canvas — extracted to break circular dependency
// TemplateEditor imports layouts, layouts must NOT import back from TemplateEditor

export interface TemplateCanvasData {
  title: string;
  bullets: string[];
  cta: string;
  disclaimer: string;
  brandName: string;
  logoUrl: string;
  colors: string[];
  dateTime?: string;
  location?: string;
}

export interface TemplateCanvasProps {
  data: TemplateCanvasData;
  onFieldClick: (field: string) => void;
  activeField: string | null;
}
