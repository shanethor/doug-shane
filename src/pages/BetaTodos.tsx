import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBetaUser, BETA_USERS } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, AlertCircle, CalendarIcon, X, Link2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ClientLookupSheet } from "@/components/ClientLookupSheet";

interface Todo {
  id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
}

// Local state for linked clients (not persisted to DB in this demo)
const linkedClients: Record<string, { id: string; name: string }> = {};

export default function BetaTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [rtError, setRtError] = useState(false);
  const [, forceUpdate] = useState(0);
  const user = getCurrentBetaUser();

  // Default assignee to current user
  useEffect(() => {
    if (user && !assignee) setAssignee(user.id);
  }, [user]);

  // Load todos
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("beta_todos")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setTodos(data as Todo[]);
    };
    load();
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("beta-todos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "beta_todos" }, (payload) => {
        const newTodo = payload.new as Todo;
        setTodos((prev) => prev.some((t) => t.id === newTodo.id) ? prev : [...prev, newTodo]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "beta_todos" }, (payload) => {
        const updated = payload.new as Todo;
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setRtError(true);
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const addTodo = async () => {
    if (!title.trim() || !user || adding) return;
    setAdding(true);
    await supabase.from("beta_todos").insert({
      title: title.trim(),
      assignee_id: assignee === "unassigned" ? null : assignee,
      created_by: user.id,
      due_date: dueDate ? dueDate.toISOString() : null,
    } as any);
    setTitle("");
    setAssignee(user.id);
    setDueDate(undefined);
    setAdding(false);
  };

  const toggleDone = async (todo: Todo) => {
    await supabase.from("beta_todos").update({ is_done: !todo.is_done, updated_at: new Date().toISOString() } as any).eq("id", todo.id);
  };

  const updateAssignee = async (todo: Todo, newAssignee: string) => {
    await supabase.from("beta_todos").update({ assignee_id: newAssignee === "unassigned" ? null : newAssignee, updated_at: new Date().toISOString() } as any).eq("id", todo.id);
  };

  const updateDueDate = async (todo: Todo, date: Date | undefined) => {
    await supabase.from("beta_todos").update({ due_date: date ? date.toISOString() : null, updated_at: new Date().toISOString() } as any).eq("id", todo.id);
  };

  const linkClient = (todoId: string, client: { id: string; name: string }) => {
    linkedClients[todoId] = client;
    forceUpdate(n => n + 1);
  };

  const unlinkClient = (todoId: string) => {
    delete linkedClients[todoId];
    forceUpdate(n => n + 1);
  };

  if (!user) return null;

  const pending = todos.filter((t) => !t.is_done);
  const done = todos.filter((t) => t.is_done);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {rtError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Real-time connection issue — changes may not sync automatically.
        </div>
      )}

      {/* Add task */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add task…"
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } }}
            />
            <Button onClick={addTodo} disabled={!title.trim() || adding} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Assign to…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {Object.values(BETA_USERS).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dueDate ? format(dueDate, "MMM d") : "Due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDueDate(undefined)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Open ({pending.length})</p>
          {pending.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={toggleDone}
              onAssigneeChange={updateAssignee}
              onDueDateChange={updateDueDate}
              linkedClient={linkedClients[todo.id]}
              onLinkClient={(client) => linkClient(todo.id, client)}
              onUnlinkClient={() => unlinkClient(todo.id)}
            />
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completed ({done.length})</p>
          {done.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={toggleDone}
              onAssigneeChange={updateAssignee}
              onDueDateChange={updateDueDate}
              linkedClient={linkedClients[todo.id]}
              onLinkClient={(client) => linkClient(todo.id, client)}
              onUnlinkClient={() => unlinkClient(todo.id)}
            />
          ))}
        </div>
      )}

      {todos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center pt-8">No tasks yet. Add one above!</p>
      )}
    </div>
  );
}

function TodoRow({ todo, onToggle, onAssigneeChange, onDueDateChange, linkedClient, onLinkClient, onUnlinkClient }: {
  todo: Todo;
  onToggle: (t: Todo) => void;
  onAssigneeChange: (t: Todo, v: string) => void;
  onDueDateChange: (t: Todo, d: Date | undefined) => void;
  linkedClient?: { id: string; name: string };
  onLinkClient: (client: { id: string; name: string }) => void;
  onUnlinkClient: () => void;
}) {
  const assignee = todo.assignee_id ? BETA_USERS[todo.assignee_id] : null;
  const isOverdue = todo.due_date && !todo.is_done && new Date(todo.due_date) < new Date();

  return (
    <Card className={todo.is_done ? "opacity-60" : ""}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Checkbox checked={todo.is_done} onCheckedChange={() => onToggle(todo)} />
          <span className={`flex-1 text-sm min-w-0 ${todo.is_done ? "line-through text-muted-foreground" : ""}`}>
            {todo.title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {/* Assignee selector */}
            <Select value={todo.assignee_id || "unassigned"} onValueChange={(v) => onAssigneeChange(todo, v)}>
              <SelectTrigger className={`h-7 w-[110px] text-[10px] ${assignee ? "" : "border-dashed"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {Object.values(BETA_USERS).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${u.avatarColor}`} />
                      {u.name.split(" ")[0]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-7 text-[10px] gap-1 px-2 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                  <CalendarIcon className="h-3 w-3" />
                  {todo.due_date ? format(new Date(todo.due_date), "MMM d") : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={todo.due_date ? new Date(todo.due_date) : undefined} onSelect={(d) => onDueDateChange(todo, d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Linked client row */}
        <div className="flex items-center gap-2 pl-7">
          {linkedClient ? (
            <div className="flex items-center gap-1.5">
              <Link to={`/lead/${linkedClient.id}`} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium">
                <ExternalLink className="h-3 w-3" />
                {linkedClient.name}
              </Link>
              <button onClick={onUnlinkClient} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <ClientLookupSheet
              trigger={
                <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                  <Link2 className="h-3 w-3" />
                  Link to client
                </button>
              }
              onSelect={(lead) => onLinkClient({ id: lead.id, name: lead.account_name })}
              closeOnSelect
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
