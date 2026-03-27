
-- Design templates (system + user-created base templates)
CREATE TABLE public.design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  base_width INTEGER NOT NULL DEFAULT 1080,
  base_height INTEGER NOT NULL DEFAULT 1080,
  design_json JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User's saved creations (cloned from templates)
CREATE TABLE public.design_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.design_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  design_json JSONB NOT NULL DEFAULT '{}',
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_creations ENABLE ROW LEVEL SECURITY;

-- Templates are public-readable (system templates)
CREATE POLICY "Anyone can read design templates"
  ON public.design_templates FOR SELECT
  TO authenticated USING (true);

-- Creations are user-scoped
CREATE POLICY "Users manage own creations"
  ON public.design_creations FOR ALL
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert default templates
INSERT INTO public.design_templates (name, category, description, is_default, base_width, base_height, design_json) VALUES
('Referral Ask', 'promotion', 'Ask your network for referrals with a clean branded card', true, 1080, 1080, '{"version":"1.0","objects":[{"type":"rect","left":0,"top":0,"width":1080,"height":1080,"fill":"{{primaryColor}}","selectable":false},{"type":"rect","left":40,"top":40,"width":1000,"height":1000,"rx":24,"ry":24,"fill":"#ffffff","opacity":0.95},{"type":"textbox","left":80,"top":120,"width":920,"fontSize":56,"fontWeight":"bold","fill":"#1a1a1a","text":"Know Someone Who\\nNeeds Coverage?","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":320,"width":920,"fontSize":28,"fill":"#444444","text":"We help protect families and businesses\\nwith the right insurance coverage.\\n\\nRefer a friend and earn rewards!","fontFamily":"Arial","textAlign":"center","lineHeight":1.5},{"type":"textbox","left":80,"top":680,"width":920,"fontSize":36,"fontWeight":"bold","fill":"{{primaryColor}}","text":"{{brandName}}","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":900,"width":920,"fontSize":20,"fill":"#888888","text":"{{disclaimer}}","fontFamily":"Arial","textAlign":"center"}]}'),
('Renewal Reminder', 'announcement', 'Remind clients their policy renewal is approaching', true, 1080, 1080, '{"version":"1.0","objects":[{"type":"rect","left":0,"top":0,"width":1080,"height":1080,"fill":"#1B2A4A"},{"type":"textbox","left":80,"top":100,"width":920,"fontSize":48,"fontWeight":"bold","fill":"#ffffff","text":"Your Policy Renewal\\nis Coming Up","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":340,"width":920,"fontSize":26,"fill":"#B8C9E8","text":"Don''t let your coverage lapse.\\nContact us today to review your options\\nand ensure you''re properly protected.","fontFamily":"Arial","textAlign":"center","lineHeight":1.6},{"type":"textbox","left":80,"top":620,"width":920,"fontSize":32,"fontWeight":"bold","fill":"#FFD700","text":"Call or Email Us Today","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":780,"width":920,"fontSize":40,"fontWeight":"bold","fill":"#ffffff","text":"{{brandName}}","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":950,"width":920,"fontSize":18,"fill":"#6B7B9E","text":"{{disclaimer}}","fontFamily":"Arial","textAlign":"center"}]}'),
('New Client Welcome', 'announcement', 'Welcome new clients with a warm branded graphic', true, 1080, 1080, '{"version":"1.0","objects":[{"type":"rect","left":0,"top":0,"width":1080,"height":1080,"fill":"{{primaryColor}}"},{"type":"textbox","left":80,"top":200,"width":920,"fontSize":64,"fontWeight":"bold","fill":"#ffffff","text":"Welcome to\\nthe Family!","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":480,"width":920,"fontSize":28,"fill":"#ffffffcc","text":"We''re thrilled to have you as a client.\\nYour protection is our priority.","fontFamily":"Arial","textAlign":"center","lineHeight":1.5},{"type":"textbox","left":80,"top":750,"width":920,"fontSize":36,"fontWeight":"bold","fill":"#ffffff","text":"{{brandName}}","fontFamily":"Arial","textAlign":"center"}]}'),
('Risk Tip', 'educational', 'Share an insurance tip or risk management insight', true, 1080, 1350, '{"version":"1.0","objects":[{"type":"rect","left":0,"top":0,"width":1080,"height":1350,"fill":"#0D1117"},{"type":"textbox","left":80,"top":80,"width":920,"fontSize":22,"fontWeight":"bold","fill":"{{primaryColor}}","text":"💡 RISK TIP","fontFamily":"Arial"},{"type":"textbox","left":80,"top":160,"width":920,"fontSize":44,"fontWeight":"bold","fill":"#ffffff","text":"Did You Know?","fontFamily":"Arial"},{"type":"textbox","left":80,"top":300,"width":920,"fontSize":26,"fill":"#B0B8C8","text":"Most business owners are underinsured\\nfor cyber liability. A single data breach\\ncan cost $200K+ in legal fees alone.\\n\\n✓ Review your cyber coverage annually\\n✓ Train employees on phishing\\n✓ Implement multi-factor authentication\\n✓ Have an incident response plan","fontFamily":"Arial","lineHeight":1.6},{"type":"textbox","left":80,"top":900,"width":920,"fontSize":28,"fill":"#ffffff","text":"Want a free coverage review?","fontFamily":"Arial","textAlign":"center","fontWeight":"bold"},{"type":"textbox","left":80,"top":1050,"width":920,"fontSize":32,"fontWeight":"bold","fill":"{{primaryColor}}","text":"{{brandName}}","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":1250,"width":920,"fontSize":16,"fill":"#555555","text":"{{disclaimer}}","fontFamily":"Arial","textAlign":"center"}]}'),
('Event Invite', 'event', 'Promote a webinar, seminar, or networking event', true, 1080, 1080, '{"version":"1.0","objects":[{"type":"rect","left":0,"top":0,"width":1080,"height":1080,"fill":"#1a1a2e"},{"type":"rect","left":0,"top":0,"width":1080,"height":8,"fill":"{{primaryColor}}"},{"type":"textbox","left":80,"top":100,"width":920,"fontSize":22,"fontWeight":"bold","fill":"{{primaryColor}}","text":"YOU''RE INVITED","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":180,"width":920,"fontSize":48,"fontWeight":"bold","fill":"#ffffff","text":"Insurance 101:\\nProtecting Your Business","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":420,"width":920,"fontSize":26,"fill":"#aaaaaa","text":"📅 Date & Time Here\\n📍 Location Here\\n\\nJoin us for an informative session\\non commercial insurance essentials.","fontFamily":"Arial","textAlign":"center","lineHeight":1.6},{"type":"textbox","left":80,"top":780,"width":920,"fontSize":32,"fontWeight":"bold","fill":"#ffffff","text":"RSVP Today","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":900,"width":920,"fontSize":28,"fill":"{{primaryColor}}","text":"{{brandName}}","fontFamily":"Arial","textAlign":"center","fontWeight":"bold"}]}'),
('Seasonal Promo', 'promotion', 'Seasonal or holiday themed promotional graphic', true, 1080, 1080, '{"version":"1.0","objects":[{"type":"rect","left":0,"top":0,"width":1080,"height":1080,"fill":"#2D1B4E"},{"type":"textbox","left":80,"top":150,"width":920,"fontSize":56,"fontWeight":"bold","fill":"#FFD700","text":"Spring Into\\nSavings! 🌸","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":400,"width":920,"fontSize":26,"fill":"#E8D5F5","text":"Bundle your home & auto policies\\nand save up to 25% this season.\\n\\nFree quotes • No obligation • Fast service","fontFamily":"Arial","textAlign":"center","lineHeight":1.6},{"type":"textbox","left":80,"top":720,"width":920,"fontSize":32,"fontWeight":"bold","fill":"#ffffff","text":"Get Your Free Quote Today","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":850,"width":920,"fontSize":36,"fontWeight":"bold","fill":"#FFD700","text":"{{brandName}}","fontFamily":"Arial","textAlign":"center"},{"type":"textbox","left":80,"top":980,"width":920,"fontSize":16,"fill":"#8B7BA8","text":"{{disclaimer}}","fontFamily":"Arial","textAlign":"center"}]}');
