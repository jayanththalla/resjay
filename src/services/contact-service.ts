// ResumeForge AI – Contact Management Service
// Stores and manages recruiter/hiring manager contacts

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  location?: string;
  
  // Interaction history
  interactions: ContactInteraction[];
  lastContactDate?: number;
  nextContactDate?: number;
  
  // Notes
  notes?: string;
  tags: string[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface ContactInteraction {
  id: string;
  date: number;
  type: 'email' | 'dm' | 'call' | 'meeting' | 'note';
  subject?: string;
  notes?: string;
}

export interface ContactStats {
  totalContacts: number;
  recentContacts: number;
  activeCompanies: number;
  engagementRate: number;
}

class ContactService {
  private storageKey = 'resumeforge_contacts';
  private tagsKey = 'resumeforge_contact_tags';

  // Create contact
  async createContact(data: Omit<Contact, 'id' | 'interactions' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const contact: Contact = {
      ...data,
      id: `contact_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      interactions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const contacts = await this.getAllContacts();
    contacts.push(contact);
    await this.saveContacts(contacts);

    return contact;
  }

  // Update contact
  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
    const contacts = await this.getAllContacts();
    const index = contacts.findIndex((c) => c.id === id);

    if (index === -1) throw new Error(`Contact ${id} not found`);

    contacts[index] = {
      ...contacts[index],
      ...updates,
      updatedAt: Date.now(),
    };

    await this.saveContacts(contacts);
    return contacts[index];
  }

  // Get all contacts
  async getAllContacts(): Promise<Contact[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        resolve(result[this.storageKey] || []);
      });
    });
  }

  // Get contact by ID
  async getContact(id: string): Promise<Contact | null> {
    const contacts = await this.getAllContacts();
    return contacts.find((c) => c.id === id) || null;
  }

  // Search contacts
  async searchContacts(query: string): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    const lowercaseQuery = query.toLowerCase();

    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(lowercaseQuery) ||
        c.company.toLowerCase().includes(lowercaseQuery) ||
        c.email?.toLowerCase().includes(lowercaseQuery) ||
        c.title.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get contacts by company
  async getContactsByCompany(company: string): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    return contacts.filter((c) => c.company.toLowerCase() === company.toLowerCase());
  }

  // Get contacts by tag
  async getContactsByTag(tag: string): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    return contacts.filter((c) => c.tags.includes(tag));
  }

  // Add interaction to contact
  async addInteraction(
    contactId: string,
    interaction: Omit<ContactInteraction, 'id'>
  ): Promise<Contact> {
    const contacts = await this.getAllContacts();
    const index = contacts.findIndex((c) => c.id === contactId);

    if (index === -1) throw new Error(`Contact ${contactId} not found`);

    const newInteraction: ContactInteraction = {
      ...interaction,
      id: `interaction_${Date.now()}`,
    };

    contacts[index].interactions.push(newInteraction);
    contacts[index].lastContactDate = newInteraction.date;
    contacts[index].updatedAt = Date.now();

    await this.saveContacts(contacts);
    return contacts[index];
  }

  // Get recent contacts (contacted in last 30 days)
  async getRecentContacts(days: number = 30): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;

    return contacts.filter((c) => c.lastContactDate && c.lastContactDate >= cutoffDate);
  }

  // Get contacts due for follow-up
  async getContactsDueForFollowUp(): Promise<Contact[]> {
    const contacts = await this.getAllContacts();
    const now = Date.now();

    return contacts.filter((c) => c.nextContactDate && c.nextContactDate <= now);
  }

  // Bulk import contacts
  async bulkImportContacts(contacts: Omit<Contact, 'id' | 'interactions' | 'createdAt' | 'updatedAt'>[]): Promise<Contact[]> {
    const imported = contacts.map((c) => ({
      ...c,
      id: `contact_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      interactions: [] as ContactInteraction[],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const existing = await this.getAllContacts();
    const allContacts = [...existing, ...imported];
    await this.saveContacts(allContacts);

    return imported;
  }

  // Delete contact
  async deleteContact(id: string): Promise<void> {
    const contacts = await this.getAllContacts();
    const filtered = contacts.filter((c) => c.id !== id);
    await this.saveContacts(filtered);
  }

  // Get all tags
  async getAllTags(): Promise<string[]> {
    const contacts = await this.getAllContacts();
    const tagSet = new Set<string>();

    contacts.forEach((c) => {
      c.tags.forEach((tag) => tagSet.add(tag));
    });

    return Array.from(tagSet);
  }

  // Get contact stats
  async getStats(): Promise<ContactStats> {
    const contacts = await this.getAllContacts();
    const recent = await this.getRecentContacts(30);

    const companies = new Set(contacts.map((c) => c.company));
    const totalInteractions = contacts.reduce((sum, c) => sum + c.interactions.length, 0);
    const engagementRate = contacts.length > 0 ? (recent.length / contacts.length) * 100 : 0;

    return {
      totalContacts: contacts.length,
      recentContacts: recent.length,
      activeCompanies: companies.size,
      engagementRate: Math.round(engagementRate),
    };
  }

  // Export contacts as JSON
  async exportContacts(): Promise<string> {
    const contacts = await this.getAllContacts();
    return JSON.stringify(contacts, null, 2);
  }

  // Import contacts from JSON
  async importContacts(jsonString: string): Promise<Contact[]> {
    try {
      const imported = JSON.parse(jsonString) as Omit<Contact, 'id' | 'interactions' | 'createdAt' | 'updatedAt'>[];
      return this.bulkImportContacts(imported);
    } catch (error) {
      throw new Error('Invalid JSON format for contacts');
    }
  }

  private async saveContacts(contacts: Contact[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: contacts }, () => {
        resolve();
      });
    });
  }
}

export const contactService = new ContactService();
