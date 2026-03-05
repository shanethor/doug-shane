import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentBetaUser, BETA_USERS } from "@/lib/beta-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Todo {
  id: string;
  title: string;
  is_done: boolean;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function BetaTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [adding, setAdding] = useState(false);
  const [rtError, setRtError] = useState(false);
  const user = getCurrentBetaUser();

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "beta_todos" },
        (payload) => {
          const newTodo = payload.new as Todo;
          setTodos((prev) => {
            if (prev.some((t) => t.id === newTodo.id)) return prev;
            return [...prev, newTodo];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "beta_todos" },
        (payload) => {
          const updated = payload.new as Todo;
          setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }
      )
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
    });
    setTitle("");
    setAssignee("unassigned");
    setAdding(false);
  };

  const toggleDone = async (todo: Todo) => {
    await supabase
      .from("beta_todos")
      .update({ is_done: !todo.is_done, updated_at: new Date().toISOString() })
      .eq("id", todo.id);
  };

  const updateAssignee = async (todo: Todo, newAssignee: string) => {
    await supabase
      .from("beta_todos")
      .update({ assignee_id: newAssignee === "unassigned" ? null : newAssignee, updated_at: new Date().toISOString() })
      .eq("id", todo.id);
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
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add task…"
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } }}
            />
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {Object.values(BETA_USERS).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addTodo} disabled={!title.trim() || adding} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Open ({pending.length})</p>
          {pending.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onToggle={toggleDone} onAssigneeChange={updateAssignee} />
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completed ({done.length})</p>
          {done.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onToggle={toggleDone} onAssigneeChange={updateAssignee} />
          ))}
        </div>
      )}

      {todos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center pt-8">No tasks yet. Add one above!</p>
      )}
    </div>
  );
}

function TodoRow({ todo, onToggle, onAssigneeChange }: { todo: Todo; onToggle: (t: Todo) => void; onAssigneeChange: (t: Todo, v: string) => void }) {
  const assignee = todo.assignee_id ? BETA_USERS[todo.assignee_id] : null;

  return (
    <Card className={todo.is_done ? "opacity-60" : ""}>
      <CardContent className="p-3 flex items-center gap-3">
        <Checkbox
          checked={todo.is_done}
          onCheckedChange={() => onToggle(todo)}
        />
        <span className={`flex-1 text-sm ${todo.is_done ? "line-through text-muted-foreground" : ""}`}>
          {todo.title}
        </span>
        {assignee ? (
          <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
            <span className={`inline-block h-2 w-2 rounded-full ${assignee.avatarColor}`} />
            {assignee.name.split(" ")[0]}
          </Badge>
        ) : (
          <Select value="unassigned" onValueChange={(v) => onAssigneeChange(todo, v)}>
            <SelectTrigger className="h-7 w-[100px] text-[10px] border-dashed">
              <SelectValue placeholder="Assign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {Object.values(BETA_USERS).map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {format(new Date(todo.created_at), "MMM d")}
        </span>
      </CardContent>
    </Card>
  );
}
