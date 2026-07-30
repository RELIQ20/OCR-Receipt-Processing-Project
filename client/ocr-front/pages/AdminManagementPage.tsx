import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Edit2, ShieldAlert, UserPlus, Check, X, Shield } from "lucide-react";

import { adminFetchUsers, adminCreateUser, adminUpdateRole, adminDeleteUser, type PublicUser } from "../src/lib/auth-client";

interface AdminManagementPageProps {
  currentUser: PublicUser;
}

export default function AdminManagementPage({ currentUser }: AdminManagementPageProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const THEME = {
    light: {
      pageBg: "#F6F2E6",
      barBg: "#046241",
      sidebarBg: "#133020",
      surface: "#ffffff",
      surfaceAlt: "#f5eedb",
      text: "#133020",
      textMuted: "#046241",
      onBar: "#ffffff",
      onBarMuted: "rgba(255,255,255,0.7)",
      green: "#046241",
      greenDeep: "#133020",
      accent: "#FFB347",
      accentInk: "#133020",
      border: "rgba(19,48,32,0.1)",
      danger: "#ef4444",
      blue: "#3b82f6",
      paper: "#f5eedb",
    },
  };
  const t = THEME.light;

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit Mode state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminFetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    if (!editingRole || editingRole === users.find(u => u.id === userId)?.role) {
      setEditingUserId(null);
      return;
    }
    try {
      setIsUpdating(true);
      await adminUpdateRole(userId, editingRole);
      setUsers(users.map(u => (u.id === userId ? { ...u, role: editingRole } : u)));
      setEditingUserId(null);
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this account?")) return;
    
    try {
      await adminDeleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center py-10 px-6 font-sans">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <a href="/" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} />
            </a>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: t.accent }}>Superadmin Control</h1>
              <p className="text-sm text-white/50 font-medium">Manage platform users, roles, and security.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#FFB347] text-[#133020] hover:brightness-110 transition-all shadow-md"
          >
            <UserPlus size={16} />
            Create Account
          </button>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
            {error}
          </div>
        ) : (
          <div className="bg-[#1c1c1c] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-white/40 uppercase">User</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-white/40 uppercase">Role</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-white/40 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-wider text-white/40 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-white/50">Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-white/50">No users found.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-white">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-white/50 font-mono mt-0.5">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingRole}
                              onChange={e => setEditingRole(e.target.value)}
                              disabled={isUpdating}
                              className="bg-black/50 border border-white/10 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-[#FFB347]"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Super Admin</option>
                            </select>
                            <button onClick={() => handleUpdateRole(user.id)} disabled={isUpdating} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingUserId(null)} disabled={isUpdating} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              user.role === 'superadmin' ? 'bg-[#FFB347]/20 text-[#FFB347]' :
                              user.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-white/10 text-white/70'
                            }`}>
                              {user.role === 'superadmin' && <ShieldAlert size={10} />}
                              {user.role === 'admin' && <Shield size={10} />}
                              {user.role}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUserId(user.id);
                              setEditingRole(user.role);
                            }}
                            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            title="Edit Role"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser.id}
                            className={`p-2 rounded-xl transition-colors ${user.id === currentUser.id ? 'text-white/10 cursor-not-allowed' : 'text-red-400/60 hover:text-red-400 hover:bg-red-400/10'}`}
                            title={user.id === currentUser.id ? "Cannot delete yourself" : "Delete Account"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newUser) => {
            setUsers([newUser, ...users]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (u: PublicUser) => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", role: "user" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const newUser = await adminCreateUser(form);
      onSuccess(newUser);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-[#1c1c1c] rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Create New Account</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold">{error}</div>}
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">First Name</label>
              <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#FFB347] transition-colors" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Last Name</label>
              <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#FFB347] transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Username</label>
            <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#FFB347] transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#FFB347] transition-colors" />
          </div>

          <div className="flex gap-4">
             <div className="flex-1">
              <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#FFB347] transition-colors" />
            </div>
            <div className="w-1/3 shrink-0">
              <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#FFB347] transition-colors">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-4 bg-[#FFB347] text-[#133020] font-bold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
