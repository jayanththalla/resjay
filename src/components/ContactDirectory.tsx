import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input, Card, CardContent } from './ui/index';
import { contactService, type Contact } from '@/services/contact-service';
import { Users, Search, Mail, Linkedin, MessageSquare, Trash2, Plus, Download, Upload } from 'lucide-react';

export function ContactDirectory() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const contactsList = await contactService.getAllContacts();
      const statsData = await contactService.getStats();
      setContacts(contactsList);
      setStats(statsData);
    } catch (error) {
      console.error('[v0] Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    const filtered = searchTerm
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : contacts;

    setFilteredContacts(filtered);
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm('Delete this contact?')) {
      await contactService.deleteContact(id);
      loadContacts();
    }
  };

  const handleExportContacts = async () => {
    const data = await contactService.exportContacts();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats.totalContacts}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Recent</p>
              <p className="text-xl font-bold">{stats.recentContacts}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Companies</p>
              <p className="text-xl font-bold">{stats.activeCompanies}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Button onClick={handleExportContacts} variant="outline" size="sm">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Contacts List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground">No contacts found</p>
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="glass-card">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">{contact.name}</h4>
                    <p className="text-xs text-muted-foreground">{contact.title} @ {contact.company}</p>
                    {contact.email && <p className="text-xs text-primary mt-1">{contact.email}</p>}
                    {contact.location && <p className="text-xs text-muted-foreground">{contact.location}</p>}
                    {contact.interactions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.interactions.length} interaction{contact.interactions.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="p-2 hover:bg-muted rounded transition-colors">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {contact.linkedinUrl && (
                      <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded">
                        <Linkedin className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
