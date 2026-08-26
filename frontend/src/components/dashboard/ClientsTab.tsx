import React, { useState } from 'react';
import { ClientProfile } from '../../types';
import { Plus, Search, Trash2, Edit2, User, Mail, Phone, MapPin, Building2 } from 'lucide-react';

export interface ClientsTabProps {
  clients: ClientProfile[];
  onSaveClient: (client: ClientProfile) => void;
  onDeleteClient: (id: string) => void;
  theme?: 'light' | 'dark';
}

export default function ClientsTab({
  clients = [],
  onSaveClient,
  onDeleteClient,
  theme = 'light'
}: ClientsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenEditor = (cl: ClientProfile | null) => {
    if (cl) {
      setEditingClient(cl);
      setName(cl.name || '');
      setCompanyName(cl.companyName || '');
      setEmail(cl.email || '');
      setPhone(cl.phone || '');
      setAddress(cl.address || '');
      setGstin(cl.gstin || '');
    } else {
      setEditingClient(null);
      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setGstin('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClient: ClientProfile = {
      id: editingClient ? editingClient.id : `client_${Date.now()}`,
      name: name.trim(),
      companyName: companyName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gstin: gstin.trim(),
    };

    onSaveClient(newClient);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#111a36] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs">
        <div>
          <h2 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Client Directory</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Manage customer profiles and billing information.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenEditor(null)}
            className="px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Client Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white dark:bg-[#111a36] p-12 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 text-center space-y-3">
          <User className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">No Clients Found</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-400 max-w-sm mx-auto">
            {searchTerm ? 'No clients match your search query.' : 'Add your first client to streamline invoice generation.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white dark:bg-[#111a36] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223269]/70 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-[#0f172a] dark:text-white">{client.name}</h3>
                    {client.companyName && (
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#0284c7]" />
                        <span>{client.companyName}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditor(client)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284c7] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteClient(client.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-zinc-300 font-mono">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {client.gstin && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] font-mono text-slate-400">
                  GSTIN: <span className="font-bold text-slate-600 dark:text-zinc-300">{client.gstin}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating / Editing Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111a36] rounded-2xl border border-slate-200 dark:border-[#223269] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0f172a] dark:text-white">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b264f] border border-slate-200 dark:border-[#223269] text-[#0f172a] dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#0284c7] hover:bg-[#0369a1] text-white transition-all cursor-pointer shadow-md"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
