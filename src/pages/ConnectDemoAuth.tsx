import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight } from "lucide-react";

type Step = "auth" | "subscribe" | "welcome";

export default function ConnectDemoAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) setStep("subscribe");
  };

  const handleSubscribe = () => {
    setStep("welcome");
  };

  const handleEnter = () => {
    sessionStorage.setItem("connect-demo-auth", "true");
    sessionStorage.setItem("connect-demo-name", name || email.split("@")[0]);
    navigate("/connectdemo");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">AURA Connect</h1>
          <p className="text-sm text-muted-foreground">Your relationship intelligence suite</p>
        </div>

        {step === "auth" && (
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>Sign up to explore AURA Connect</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">
                  Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "subscribe" && (
          <Card>
            <CardHeader>
              <CardTitle>Choose your plan</CardTitle>
              <CardDescription>Start with AURA Connect</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-primary p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">AURA Connect Pro</span>
                  <span className="text-lg font-bold text-primary">$49/mo</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ AI-Powered Pipeline</li>
                  <li>✓ Email & Calendar Integration</li>
                  <li>✓ Spotlight Marketing Tools</li>
                  <li>✓ AI Assistant</li>
                </ul>
              </div>
              <Button className="w-full" onClick={handleSubscribe}>
                Subscribe <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">Demo mode — no payment required</p>
            </CardContent>
          </Card>
        )}

        {step === "welcome" && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to AURA Connect</h2>
              <p className="text-muted-foreground">
                Your workspace is ready. Let's get started.
              </p>
              <Button size="lg" className="mt-4" onClick={handleEnter}>
                Enter AURA Connect <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
