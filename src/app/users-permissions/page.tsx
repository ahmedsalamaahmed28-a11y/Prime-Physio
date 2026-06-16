"use client";

import { useState, useEffect } from "react";
import { Shield, Users, UserPlus, Check, Key, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

export default function UsersPermissionsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Forms state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "#.5'&J 9D', 7(J9J",
    permissions: "*9/JD 'D3,D'* 'D7(J) H-,2 ,D3'* 9D',J)",
    phone: "0500000000",
    dateJoined: new Date().toISOString().split("T")[0],
    status: "F47"
  });

  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [deleteUserEmail, setDeleteUserEmail] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    permissions: "",
    phone: "",
    dateJoined: "",
    status: ""
  });

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase.from("staff").select("*").order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load staff from Supabase", error);
        setUsers([]);
        return;
      }
      setUsers((data || []).map((u: any) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        permissions: u.permissions || "",
        phone: u.phone || "",
        dateJoined: u.date_joined || u.dateJoined || "",
        status: u.status || "� شط",
      })));
    }
    loadUsers();
  }, []);

  const saveUsers = async () => {
    const { data, error } = await supabase.from("staff").select("*").order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to refresh staff from Supabase", error);
      return;
    }
    setUsers((data || []).map((u: any) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.permissions || "",
      phone: u.phone || "",
      dateJoined: u.date_joined || "",
      status: u.status || "� شط",
    })));
  };

  // Auto-set permissions description based on role
  const handleRoleChange = (role: string, isEdit: boolean = false) => {
    let perms = "";
    if (role === "E/J1 'D9J'/G") {
      perms = "C'ED 'D5D'-J'* 'DE'DJ) H'D%/'1J) DD9J'/)";
    } else if (role === "'3*4'1J 9D', 7(J9J") {
      perms = "5D'-J'* 7(J) C'ED) H%5/'1 .77 9D',J)";
    } else if (role === "#.5'&J 9D', 7(J9J") {
      perms = "*9/JD 'D3,D'* 'D7(J) H-,2 ,D3'* 9D',J)";
    } else if (role === "EE'13 9D', 7(J9J") {
      perms = "916 H*-/J+ 3,D'* 'DE16I H*H+JB 'D,D3'*";
    } else if (role === "EH8A '3*B('D") {
      perms = "-,2 EH'9J/ H'3*D'E AH'*J1 FB/J)";
    }

    if (isEdit) {
      setEditFormData(prev => ({ ...prev, role, permissions: perms }));
    } else {
      setFormData(prev => ({ ...prev, role, permissions: perms }));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("'D1,'! %/.'D 'D'3E H'D(1J/ 'D%DC*1HFJ");
      return;
    }

    // Check duplicate email
    if (users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      alert("G0' 'D(1J/ 'D%DC*1HFJ E3,D ('DA9D");
      return;
    }

    const { error } = await supabase.from("staff").insert({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      permissions: formData.permissions,
      phone: formData.phone,
      date_joined: formData.dateJoined,
      status: formData.status,
    });
    if (error) {
      console.error("Failed to add user to Supabase", error);
      alert("فش�ت إضافة ا��&ستخد�&");
      return;
    }
    await saveUsers();
    setIsAddOpen(false);
    setFormData({
      name: "",
      email: "",
      role: "#.5'&J 9D', 7(J9J",
      permissions: "*9/JD 'D3,D'* 'D7(J) H-,2 ,D3'* 9D',J)",
      phone: "0500000000",
      dateJoined: new Date().toISOString().split("T")[0],
      status: "F47"
    });
  };

  const handleEditClick = (user: any) => {
    setEditingUserEmail(user.email);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      phone: user.phone || "0500000000",
      dateJoined: user.dateJoined || new Date().toISOString().split("T")[0],
      status: user.status
    });
    setIsEditOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.email) {
      alert("'D1,'! %/.'D 'D'3E H'D(1J/ 'D%DC*1HFJ");
      return;
    }

    const { error } = await supabase
      .from("staff")
      .update({
        name: editFormData.name,
        role: editFormData.role,
        permissions: editFormData.permissions,
        phone: editFormData.phone,
        date_joined: editFormData.dateJoined,
        status: editFormData.status,
      })
      .eq("email", editingUserEmail);
    if (error) {
      console.error("Failed to update user in Supabase", error);
      alert("فش� تعد�`� ا��&ستخد�&");
      return;
    }
    await saveUsers();
    setIsEditOpen(false);
    setEditingUserEmail(null);
  };

  const handleDeleteUserClick = (email: string) => {
    setDeleteUserEmail(email);
  };

  const executeDeleteUser = async () => {
    if (!deleteUserEmail) return;
    const { error } = await supabase.from("staff").delete().eq("email", deleteUserEmail);
    if (error) {
      console.error("Failed to delete user from Supabase", error);
      alert("فش� حذف ا��&ستخد�&");
      return;
    }
    await saveUsers();
    setDeleteUserEmail(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-teal-50 p-2 rounded-xl">
              <Shield className="w-6 h-6 text-[#0d8a8a]" />
            </div>
            %/'1) 'DE3*./EJF H'D5D'-J'*
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">'D*-CE AJ -3'('* 'D7'BE 'D7(J H'D%/'1J HE3*HJ'* 'D5D'-J'* 'D.'5) (GE</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-[#0d8a8a] hover:bg-[#085454] text-white gap-2 self-start sm:self-auto rounded-xl font-bold px-6 shadow-md transition-all active:scale-95">
          <UserPlus className="w-4 h-4" />
          %6'A) E3*./E ,/J/
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list */}
        <Card className="lg:col-span-1 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-[#0d8a8a]" />
              E,EH9'* 'D5D'-J'* 'D#3'3J)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-sm">
            {[
              { role: "E/J1 'D9J'/G (Clinic Manager)", desc: "5D'-J'* E'DJ) H%/'1J) C'ED) D%/'1) 4$HF 'D9J'/) H'D*B'1J1 H'D*H8JA." },
              { role: "'3*4'1J 9D', 7(J9J (PT Consultant)", desc: "*BJJE 'D-'D'* 'DE9B/) H%5/'1 'D(1H*HCHD'* 'D7(J) H'D.77 'D9D',J)." },
              { role: "#.5'&J 9D', 7(J9J (PT Specialist)", desc: "*FAJ0 'D,D3'* H*-/J+ BJ'3'* 'DE1J6 'D96DJ) H(1'E,G 'D:0'&J) H'D1J'6J)." },
              { role: "EE'13 9D', 7(J9J (PT Practitioner)", desc: "E*'(9) *E1JF'* 'DE1J6 H*H+JB *B/E 'D,D3'* 'DJHEJ) DDE16I." },
              { role: "EH8A '3*B('D (Receptionist)", desc: "*3,JD 'DE16I H-,2 'DEH'9J/ H%5/'1 'DAH'*J1 'DFB/J) H'D*9'ED E9 'D*3HJ'*." },
            ].map((group) => (
              <div key={group.role} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <span className="font-bold text-slate-800">{group.role}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{group.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Users table */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              'D-3'('* 'DF47) ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">'DE3*./E</th>
                    <th className="py-3.5 px-6">'D/H1 'DH8JAJ</th>
                    <th className="py-3.5 px-6">F7'B 'D5D'-J'*</th>
                    <th className="py-3.5 px-6">'D-'D)</th>
                    <th className="py-3.5 px-6 text-center">'D%,1'!'*</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm text-slate-700">
                  {users.map((user) => (
                    <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{user.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">{user.permissions}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 font-medium text-xs ${user.status === "F47" ? "text-emerald-600" : "text-slate-400"}`}>
                          <Check className="w-3.5 h-3.5" />
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditClick(user)}
                            className="text-blue-600 hover:text-blue-700 text-xs gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            *9/JD
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteUserClick(user.email)}
                            className="text-rose-600 hover:text-rose-700 text-xs gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            -0A
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/*     ADD USER DIALOG                                                */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>%6'A) E3*./E ,/J/</DialogTitle>
            <DialogDescription>
              #/.D (J'F'* 'DEH8A D*HAJ1 5D'-J'* 'D/.HD 'DE.55) DG 9DI 'DEF5).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 py-4">
            <div className="space-y-1 text-right">
              <Label htmlFor="name">'D'3E</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="#/.D 'D'3E 'D+F'&J #H 'D+D'+J"
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="email">'D(1J/ 'D%DC*1HFJ</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@primephysio.com"
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="role">'DE,EH9) / 'D/H1 'DH8JAJ</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="E/J1 'D9J'/G">E/J1 'D9J'/G</option>
                <option value="'3*4'1J 9D', 7(J9J">'3*4'1J 9D', 7(J9J</option>
                <option value="#.5'&J 9D', 7(J9J">#.5'&J 9D', 7(J9J</option>
                <option value="EE'13 9D', 7(J9J">EE'13 9D', 7(J9J</option>
                <option value="EH8A '3*B('D">EH8A '3*B('D</option>
              </select>
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="permissions">H5A 'D5D'-J'*</Label>
              <Input
                id="permissions"
                value={formData.permissions}
                onChange={(e) => setFormData(prev => ({ ...prev, permissions: e.target.value }))}
                placeholder="H5A E.55 DD5D'-J'* 'DEEFH-)"
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="status">'D-'D)</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="F47">F47</option>
                <option value=":J1 F47">:J1 F47</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl font-bold">%D:'!</Button>
                <Button type="submit" className="bg-[#0d8a8a] hover:bg-[#085454] text-white rounded-xl font-bold px-6">%6'A)</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/*     EDIT USER DIALOG                                               */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>*9/JD 5D'-J'* 'DE3*./E</DialogTitle>
            <DialogDescription>
              BE (*9/JD (J'F'* 'DE3*./E #H *:JJ1 /H1G HE3*HI 5D'-J'*G.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 py-4">
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-name">'D'3E</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-email">'D(1J/ 'D%DC*1HFJ</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                disabled
                className="bg-slate-100 dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-role">'DE,EH9) / 'D/H1 'DH8JAJ</Label>
              <select
                id="edit-role"
                value={editFormData.role}
                onChange={(e) => handleRoleChange(e.target.value, true)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="E/J1 'D9J'/G">E/J1 'D9J'/G</option>
                <option value="'3*4'1J 9D', 7(J9J">'3*4'1J 9D', 7(J9J</option>
                <option value="#.5'&J 9D', 7(J9J">#.5'&J 9D', 7(J9J</option>
                <option value="EE'13 9D', 7(J9J">EE'13 9D', 7(J9J</option>
                <option value="EH8A '3*B('D">EH8A '3*B('D</option>
              </select>
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-permissions">H5A 'D5D'-J'*</Label>
              <Input
                id="edit-permissions"
                value={editFormData.permissions}
                onChange={(e) => setEditFormData(prev => ({ ...prev, permissions: e.target.value }))}
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-status">'D-'D)</Label>
              <select
                id="edit-status"
                value={editFormData.status}
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="F47">F47</option>
                <option value=":J1 F47">:J1 F47</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold">%D:'!</Button>
                <Button type="submit" className="bg-[#0d8a8a] hover:bg-[#085454] text-white rounded-xl font-bold px-6">-A8 'D*9/JD'*</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!deleteUserEmail} onOpenChange={(open) => !open && setDeleteUserEmail(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              *#CJ/ 'D-0A
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              GD #F* E*#C/ EF -0A G0' 'DE3*./E FG'&J'K 3J*E %D:'! 5D'-J'* 'D/.HD 'D.'5) (G.
            </DialogDescription>
          </div>
          <div className="mt-6 flex gap-3 w-full flex-row-reverse">
            <Button type="button" variant="outline" onClick={() => setDeleteUserEmail(null)} className="flex-1 rounded-xl font-bold">
              %D:'!
            </Button>
            <Button type="button" onClick={executeDeleteUser} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              F9E '-0A
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
