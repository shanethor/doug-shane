import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Trash2, Users, Globe, Shield, ChevronDown, ChevronUp, Search, Upload, Image } from "lucide-react";
import { toast } from "sonner";

interface Agency {
  id: string;
  name: string;
  code: string;
  website?: string;
  logo_url?: string;
  full_site_access: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  agency_id?: string;
  agency_name?: string;
  primary_role?: string;
  approval_status?: string;
  branch?: string;
}

interface Props {
  agencies: Agency[];
  setAgencies: React.Dispatch<React.SetStateAction<any[]>>;
  adminUsers: AdminUser[];
  setAdminUsers: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function AdminAgencySection({ agencies, setAgencies, adminUsers, setAdminUsers }: Props) {
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyWebsite, setNewAgencyWebsite] = useState("");
  const [creatingAgency, setCreatingAgency] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAgencies = useMemo(() => {
    if (!search) return agencies;
    const q = search.toLowerCase();
    return agencies.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [agencies, search]);

  const noAgencyUsers = useMemo(() =>
    adminUsers.filter(u => !u.agency_id),
    [adminUsers]
  );

  const handleCreateAgency = async () => {
    if (!newAgencyName.trim()) return;
    setCreatingAgency(true);
    const code = newAgencyName.trim().replace(/\s+/g, "").slice(0, 6).toUpperCase() + Math.floor(Math.random() * 900 + 100);
    const { data, error } = await supabase.from("agencies").insert({
      name: newAgencyName.trim(),
      code,
      website: newAgencyWebsite.trim() || null,
    }).select().single();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Agency created!");
      setAgencies(prev => [...prev, data]);
      setNewAgencyName("");
      setNewAgencyWebsite("");
    }
    setCreatingAgency(false);
  };

  const handleDeleteAgency = async (agencyId: string, agencyName: string) => {
    if (!confirm(`Delete agency "${agencyName}"? Users will be unassigned.`)) return;
    const { error } = await supabase.functions.invoke("approve-user", {
      body: { target_user_id: agencyId, action: "delete_agency" },
    });
    if (error) { toast.error("Failed to delete agency"); return; }
    toast.success("Agency deleted");
    setAgencies(prev => prev.filter(a => a.id !== agencyId));
    setAdminUsers(prev => prev.map(u => u.agency_id === agencyId ? { ...u, agency_id: undefined, agency_name: undefined } : u));
  };

  const toggleFullSiteAccess = async (agencyId: string, current: boolean) => {
    const { error } = await supabase.from("agencies").update({ full_site_access: !current } as any).eq("id", agencyId);
    if (error) { toast.error("Failed to update"); return; }
    setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, full_site_access: !current } : a));
    toast.success(`Full site access ${!current ? "enabled" : "disabled"}`);
  };

  const handleChangeUserRole = async (userId: string, role: string) => {
    const { error } = await supabase.functions.invoke("approve-user", {
      body: { target_user_id: userId, action: "approve", role },
    });
    if (error) { toast.error("Failed to update role"); return; }
    toast.success("Role updated");
    setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, primary_role: role } : u));
  };

  const handleChangeUserBranch = async (userId: string, branch: string) => {
    const { error } = await supabase.from("profiles").update({ branch }).eq("user_id", userId);
    if (error) { toast.error("Failed to update branch"); return; }
    toast.success("Branch updated");
    setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, branch } : u));
  };

  const getUsersForAgency = (agencyId: string) =>
    adminUsers.filter(u => u.agency_id === agencyId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agencies</h2>
        <Badge variant="outline" className="text-xs">{agencies.length} total</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agencies..." className="h-9 pl-9" />
      </div>

      {/* Create new agency */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Agency
          </h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px] space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Agency Name</label>
              <Input value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} placeholder="ABC Insurance" className="h-9" />
            </div>
            <div className="flex-1 min-w-[180px] space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Website (optional)</label>
              <Input value={newAgencyWebsite} onChange={e => setNewAgencyWebsite(e.target.value)} placeholder="https://abcinsurance.com" className="h-9" />
            </div>
            <Button onClick={handleCreateAgency} disabled={creatingAgency || !newAgencyName.trim()} size="sm" className="h-9">
              {creatingAgency ? "Creating…" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agency list */}
      <div className="grid gap-2">
        {filteredAgencies.map((a) => {
          const agencyUsers = getUsersForAgency(a.id);
          const isExpanded = expandedAgency === a.id;

          return (
            <Card key={a.id} className={isExpanded ? "ring-1 ring-primary/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    className="flex items-start gap-3 text-left flex-1 min-w-0"
                    onClick={() => setExpandedAgency(isExpanded ? null : a.id)}
                  >
                    {a.logo_url ? (
                      <img src={a.logo_url} alt={a.name} className="h-9 w-9 rounded-lg object-contain bg-background shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{a.name}</p>
                        <Badge variant="secondary" className="text-[10px] font-mono">{a.code}</Badge>
                        {a.full_site_access && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-0">Full Access</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {agencyUsers.length} member{agencyUsers.length !== 1 ? "s" : ""}
                        </span>
                        {a.website && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {a.website.replace(/^https?:\/\//, "")}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive ml-2"
                    onClick={() => handleDeleteAgency(a.id, a.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Expanded: settings + user list */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Agency logo */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Image className="h-3.5 w-3.5 text-primary" />
                          Agency Logo
                        </p>
                        <p className="text-[11px] text-muted-foreground">PNG, JPG — max 2MB</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.logo_url && <img src={a.logo_url} alt="" className="h-8 w-8 rounded object-contain border" />}
                        <input
                          ref={el => { logoInputRefs.current[a.id] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(a.id, f); e.target.value = ""; }}
                        />
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploadingLogo === a.id}
                          onClick={() => logoInputRefs.current[a.id]?.click()}>
                          <Upload className="h-3 w-3" />
                          {uploadingLogo === a.id ? "Uploading…" : a.logo_url ? "Change" : "Upload"}
                        </Button>
                      </div>
                    </div>

                    {/* Agency permissions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          Full Site Access
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          When enabled, users in this agency can access the full platform (not just Connect & Concierge)
                        </p>
                      </div>
                      <Switch
                        checked={a.full_site_access}
                        onCheckedChange={() => toggleFullSiteAccess(a.id, a.full_site_access)}
                      />
                    </div>

                    {/* User list */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Members</p>
                      {agencyUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No members yet</p>
                      ) : (
                        <div className="space-y-2">
                          {agencyUsers.map(u => (
                            <div key={u.id} className="flex items-center gap-3 rounded-md border p-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                              </div>
                              <Select value={u.primary_role || "advisor"} onValueChange={(v) => handleChangeUserRole(u.id, v)}>
                                <SelectTrigger className="w-28 h-7 text-[11px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="advisor">Advisor</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="client_services">Client Svc</SelectItem>
                                  <SelectItem value="property">Property</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={u.branch || "risk"} onValueChange={(v) => handleChangeUserBranch(u.id, v)}>
                                <SelectTrigger className="w-24 h-7 text-[11px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="risk">Risk</SelectItem>
                                  <SelectItem value="property">Property</SelectItem>
                                  <SelectItem value="wealth">Consulting</SelectItem>
                                </SelectContent>
                              </Select>
                              <Badge variant={u.approval_status === "approved" ? "default" : "secondary"} className="text-[10px]">
                                {u.approval_status || "pending"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unassigned users */}
      {noAgencyUsers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              No Agency ({noAgencyUsers.length})
            </h3>
            <div className="space-y-2">
              {noAgencyUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 rounded-md border p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Select
                    value={u.agency_id || "none"}
                    onValueChange={async (agencyId) => {
                      if (agencyId === "none") return;
                      const agency = agencies.find(a => a.id === agencyId);
                      const { error } = await supabase.functions.invoke("approve-user", {
                        body: { target_user_id: u.id, action: "set_agency", agency_id: agencyId },
                      });
                      if (error) { toast.error("Failed"); return; }
                      toast.success(`Assigned to ${agency?.name}`);
                      setAdminUsers(prev => prev.map(x => x.id === u.id ? { ...x, agency_id: agencyId, agency_name: agency?.name } : x));
                    }}
                  >
                    <SelectTrigger className="w-40 h-7 text-[11px]">
                      <SelectValue placeholder="Assign agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Assign agency…</SelectItem>
                      {agencies.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
