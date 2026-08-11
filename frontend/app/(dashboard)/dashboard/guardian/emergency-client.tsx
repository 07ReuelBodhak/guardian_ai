"use client";

import { useState } from "react";
import { Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setEmergencyContact, deleteEmergencyContact, toggleEmergencyEscalation } from "./actions";

export default function EmergencyClient({ 
  contact, 
  escalationEnabled 
}: { 
  contact: { name: string; email: string } | null,
  escalationEnabled: boolean
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(escalationEnabled);

  const handleSave = async () => {
    if (!name || !email) return;
    setLoading(true);
    await setEmergencyContact(name, email);
    setLoading(false);
    setIsAdding(false);
    setName("");
    setEmail("");
    setEnabled(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteEmergencyContact();
    setLoading(false);
    setEnabled(false);
  };

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    await toggleEmergencyEscalation(val);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Emergency Contacts</CardTitle>
            <CardDescription>Escalation paths if Guardian detects severe distress</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="escalation-toggle" className="text-sm text-slate-500">Contact in crisis</Label>
            <Switch 
              id="escalation-toggle" 
              checked={enabled} 
              onCheckedChange={handleToggle}
              disabled={!contact}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {contact ? (
            <div className={`flex items-center justify-between p-3 border rounded-lg transition-opacity ${enabled ? 'border-slate-200 dark:border-slate-800' : 'opacity-50 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{contact.name}</div>
                  <div className="text-xs text-slate-500">{contact.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={enabled ? "destructive" : "secondary"} className={enabled ? "bg-rose-500" : ""}>
                  {enabled ? "Active" : "Disabled"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : isAdding ? (
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
              <input
                type="text"
                placeholder="Name (e.g. Sister, Doctor)"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setIsAdding(false)} disabled={loading}>Cancel</Button>
                <Button onClick={handleSave} disabled={loading || !name || !email}>Save Contact</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAdding(true)}>
              Add Contact
            </Button>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
