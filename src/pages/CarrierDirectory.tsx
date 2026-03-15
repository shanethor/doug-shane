import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { invalidateCarrierCache } from "@/lib/carrier-data";

interface Carrier {
  id: string;
  name: string;
  loss_run_email: string | null;
  loss_run_fax: string | null;
  notes: string | null;
}

export default function CarrierDirectory() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Carrier | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fax, setFax] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await supabase.from("carriers" as any).select("*").order("name");
    setCarriers((data as any as Carrier[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setName(""); setEmail(""); setFax(""); setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (c: Carrier) => {
    setEditing(c);
    setName(c.name);
    setEmail(c.loss_run_email || "");
    setFax(c.loss_run_fax || "");
    setNotes(c.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name) { toast.error("Name is required"); return; }
    const payload: any = { name, loss_run_email: email || null, loss_run_fax: fax || null, notes: notes || null };

    if (editing) {
      await supabase.from("carriers" as any).update(payload).eq("id", editing.id);
      toast.success("Carrier updated");
    } else {
      await supabase.from("carriers" as any).insert(payload);
      toast.success("Carrier added");
    }
    invalidateCarrierCache();
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this carrier?")) return;
    await supabase.from("carriers" as any).delete().eq("id", id);
    invalidateCarrierCache();
    toast.success("Carrier deleted");
    load();
  };

  const filtered = carriers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.loss_run_email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Carrier Directory</h1>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Carrier
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search carriers…"
          className="pl-10"
        />
      </div>

      <Card>
        {loading ? (
          <CardContent className="py-12 text-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Carrier Name</TableHead>
                <TableHead className="text-xs">Loss Run Email</TableHead>
                <TableHead className="text-xs">Fax</TableHead>
                <TableHead className="text-xs w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.loss_run_email || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.loss_run_fax || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    No carriers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Carrier" : "Add Carrier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <div>
              <Label>Carrier Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Loss Run Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Fax</Label>
              <Input value={fax} onChange={(e) => setFax(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={handleSave}>{editing ? "Update" : "Add"} Carrier</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
