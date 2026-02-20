import React, { useState, useEffect, useCallback } from 'react';
import { Input, Toast } from './ui/index';
import { Button } from './ui/button';
import { storageService, type UserProfile } from '@/services/storage-service';
import { aiService } from '@/services/ai-service';
import {
    User, Mail, Phone, Globe, MapPin, Briefcase,
    GraduationCap, Shield, DollarSign, Clock, Save, Loader2,
    FileUp,
} from 'lucide-react';

const FIELD_GROUPS = [
    {
        title: 'Personal Info',
        icon: User,
        fields: [
            { key: 'fullName', label: 'Full Name', placeholder: 'John Doe' },
            { key: 'firstName', label: 'First Name', placeholder: 'John' },
            { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
            { key: 'email', label: 'Email', placeholder: 'john@example.com', type: 'email' },
            { key: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567', type: 'tel' },
        ],
    },
    {
        title: 'Links',
        icon: Globe,
        fields: [
            { key: 'linkedinUrl', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/johndoe', type: 'url' },
            { key: 'githubUrl', label: 'GitHub URL', placeholder: 'https://github.com/johndoe', type: 'url' },
            { key: 'portfolioUrl', label: 'Portfolio / Website', placeholder: 'https://johndoe.dev', type: 'url' },
        ],
    },
    {
        title: 'Location',
        icon: MapPin,
        fields: [
            { key: 'location', label: 'Full Location', placeholder: 'San Francisco, CA' },
            { key: 'city', label: 'City', placeholder: 'San Francisco' },
            { key: 'state', label: 'State / Province', placeholder: 'California' },
            { key: 'zipCode', label: 'Zip / Postal Code', placeholder: '94105' },
            { key: 'country', label: 'Country', placeholder: 'United States' },
        ],
    },
    {
        title: 'Professional',
        icon: Briefcase,
        fields: [
            { key: 'currentTitle', label: 'Current Title', placeholder: 'Software Engineer' },
            { key: 'yearsOfExperience', label: 'Years of Experience', placeholder: '5' },
        ],
    },
    {
        title: 'Education',
        icon: GraduationCap,
        fields: [
            { key: 'highestDegree', label: 'Highest Degree', placeholder: 'B.S. Computer Science' },
            { key: 'university', label: 'University', placeholder: 'Stanford University' },
        ],
    },
    {
        title: 'Work Authorization',
        icon: Shield,
        fields: [
            { key: 'visaStatus', label: 'Visa Status', placeholder: 'US Citizen / H-1B / OPT' },
            { key: 'workAuthorization', label: 'Authorized to Work', placeholder: 'Yes' },
        ],
    },
    {
        title: 'Availability',
        icon: Clock,
        fields: [
            { key: 'noticePeriod', label: 'Notice Period', placeholder: '2 weeks' },
            { key: 'startDate', label: 'Earliest Start Date', placeholder: 'Immediately' },
            { key: 'willingToRelocate', label: 'Willing to Relocate', placeholder: 'Yes' },
        ],
    },
    {
        title: 'Compensation',
        icon: DollarSign,
        fields: [
            { key: 'salaryExpectation', label: 'Salary Expectation', placeholder: '$120,000 - $150,000' },
        ],
    },
];

export function UserProfileForm() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [saving, setSaving] = useState(false);
    const [autoPopulating, setAutoPopulating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string>('Personal Info');

    useEffect(() => {
        storageService.getUserProfile().then(setProfile);
    }, []);

    const handleChange = useCallback((key: string, value: string) => {
        setProfile((prev) => prev ? { ...prev, [key]: value } : prev);
    }, []);

    const handleSave = useCallback(async () => {
        if (!profile) return;
        setSaving(true);
        try {
            await storageService.saveUserProfile(profile);
            setToast({ message: 'Profile saved!', type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Save failed: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    }, [profile]);

    // Auto-populate from resume
    const handleAutoPopulate = useCallback(async () => {
        setAutoPopulating(true);
        try {
            // Load resume content from storage
            const data = await chrome.storage.local.get(['resumeHistory']);
            const history = data.resumeHistory;
            const resumeText = history?.versions?.[0]?.content || '';
            if (!resumeText) {
                setToast({ message: 'Upload a resume first', type: 'error' });
                return;
            }

            const extracted = await aiService.extractProfileFromResume(resumeText);

            // Merge only into empty fields
            setProfile((prev) => {
                if (!prev) return prev;
                const updated = { ...prev };
                for (const [key, value] of Object.entries(extracted)) {
                    if (value && !(updated as any)[key]) {
                        (updated as any)[key] = value;
                    }
                }
                return updated;
            });

            const filled = Object.values(extracted).filter(Boolean).length;
            setToast({ message: `Populated ${filled} fields from resume`, type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Auto-populate failed: ' + err.message, type: 'error' });
        } finally {
            setAutoPopulating(false);
        }
    }, []);

    if (!profile) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" />
                        Autofill Profile
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Your data for instant form filling
                    </p>
                </div>
                <div className="flex gap-1.5">
                    <Button
                        onClick={handleAutoPopulate}
                        disabled={autoPopulating || saving}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                    >
                        {autoPopulating ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Extracting...</>
                        ) : (
                            <><FileUp className="w-3.5 h-3.5 mr-1" /> From Resume</>
                        )}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        variant="default"
                        className="h-7"
                    >
                        {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <><Save className="w-3.5 h-3.5 mr-1" /> Save</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="space-y-1">
                {FIELD_GROUPS.map((group) => {
                    const Icon = group.icon;
                    const isExpanded = expandedGroup === group.title;
                    const filledCount = group.fields.filter(
                        (f) => (profile[f.key as keyof UserProfile] as string)?.trim()
                    ).length;

                    return (
                        <div key={group.title} className="rounded-lg border border-border overflow-hidden">
                            <button
                                onClick={() => setExpandedGroup(isExpanded ? '' : group.title)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                            >
                                <span className="flex items-center gap-2 text-xs font-medium">
                                    <Icon className="w-3.5 h-3.5 text-primary" />
                                    {group.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {filledCount}/{group.fields.length} filled
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                                    {group.fields.map((field) => (
                                        <div key={field.key}>
                                            <label className="text-[11px] text-muted-foreground mb-0.5 block">
                                                {field.label}
                                            </label>
                                            <Input
                                                type={field.type || 'text'}
                                                placeholder={field.placeholder}
                                                value={(profile[field.key as keyof UserProfile] as string) || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleChange(field.key, e.target.value)
                                                }
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
