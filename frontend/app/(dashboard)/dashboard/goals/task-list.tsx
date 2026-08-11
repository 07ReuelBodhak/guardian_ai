"use client";

import { useState } from "react";
import { Edit2, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteTask, updateTask } from "./actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
};

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for editing
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditOpen = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    // Extract YYYY-MM-DD from ISO string for the date input
    if (task.dueDate) {
      setEditDate(task.dueDate.split("T")[0]);
    } else {
      setEditDate("");
    }
  };

  const handleEditSave = async () => {
    if (!editingTask) return;
    setIsSaving(true);
    
    // Create a proper ISO datetime string or null
    let isoDate = null;
    if (editDate) {
      isoDate = new Date(editDate).toISOString();
    }

    try {
      await updateTask(editingTask.id, {
        title: editTitle,
        description: editDesc,
        dueDate: isoDate,
      });

      // Optimistically update local state
      setTasks(tasks.map(t => t.id === editingTask.id ? {
        ...t,
        title: editTitle,
        description: editDesc,
        dueDate: isoDate
      } : t));
      
      setEditingTask(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic p-4 text-center border border-dashed rounded-lg">
        No upcoming tasks. Ask your AI Guardian to create one!
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((item) => (
          <div key={item.id} className={`flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0 group ${item.status === 'completed' ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4 flex-1">
              {item.status === 'completed' ? (
                <div className="mt-1 shrink-0">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
              )}
              <div className="flex-1">
                <div className={`font-medium text-slate-900 dark:text-white flex items-center gap-2 ${item.status === 'completed' ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
                  {item.title}
                  {item.status === 'completed' && (
                    <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded">Completed</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${item.status === 'completed' ? 'text-slate-400' : 'text-rose-500'}`}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No Date"}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs text-slate-500 line-clamp-1">{item.description || "Created by AI Guardian"}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons (visible on hover) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                onClick={() => handleEditOpen(item)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                onClick={() => handleDelete(item.id)}
                disabled={isDeleting === item.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input 
                id="title" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={editDesc} 
                onChange={(e) => setEditDesc(e.target.value)} 
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="relative">
                <Input 
                  id="dueDate" 
                  type="date"
                  value={editDate} 
                  onChange={(e) => setEditDate(e.target.value)} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={isSaving || !editTitle.trim()}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
