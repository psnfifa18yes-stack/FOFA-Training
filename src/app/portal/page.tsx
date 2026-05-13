'use client';

import { useEffect, useState } from 'react';
import {
  UserCheck,
  XCircle,
  CheckCircle2,
  Loader2,
  Fingerprint,
  ClipboardEdit,
  Building,
  FileText,
  ArrowRight,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function PortalPage() {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalData, setPortalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qualifications' | 'apply' | 'assignment'>('qualifications');
  const [selection1, setSelection1] = useState('');
  const [selection2, setSelection2] = useState('');
  const [applying, setApplying] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  useEffect(() => {
    if (!portalData) {
      setStudentName('');
      setSelection1('');
      setSelection2('');
      return;
    }

    setStudentName(portalData.student?.student_name || '');
    setSelection1(portalData.selection?.training_1 || '');
    setSelection2(portalData.selection?.training_2 || '');
  }, [portalData]);

  const clearAlerts = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const formatError = (error: any) => {
    if (!error) return 'No record found for this ID.';
    if (typeof error === 'string') return error;
    if (typeof error === 'object') return error.message || JSON.stringify(error);
    return String(error);
  };

  async function checkPortal() {
    clearAlerts();

    if (!studentId.trim()) {
      setError('Please enter your Student ID.');
      return;
    }

    setLoading(true);
    setPortalData(null);

    try {
      const res = await fetch('/api/get-student-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(formatError(data.error || data.message));
      } else {
        setPortalData(data);
        setError(null);
      }
    } catch (err) {
      setError('Server connection failed.');
    } finally {
      setLoading(false);
    }
  }

  async function submitApplication() {
    clearAlerts();

    if (!studentId.trim()) {
      setError('Student ID is required to apply.');
      return;
    }

    if (!studentName.trim()) {
      setError('Please enter your full name to apply.');
      return;
    }

    setApplying(true);

    try {
      const res = await fetch('/api/student-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), student_name: studentName.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Unable to submit application.');
      } else {
        setSuccessMessage('Application submitted successfully.');
        await checkPortal();
      }
    } catch (err) {
      setError('Unable to submit application.');
    } finally {
      setApplying(false);
    }
  }

  async function saveSelection() {
    clearAlerts();

    if (!studentId.trim()) {
      setError('Student ID is required.');
      return;
    }

    if (!selection1.trim()) {
      setError('Please choose your first preferred training.');
      return;
    }

    setSavingSelection(true);

    try {
      const selections = [selection1.trim()];
      if (selection2.trim() && selection2.trim() !== selection1.trim()) {
        selections.push(selection2.trim());
      }

      const res = await fetch('/api/save-student-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), selections }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Unable to save selection.');
      } else {
        setSuccessMessage('Selection saved successfully.');
        await checkPortal();
      }
    } catch (err) {
      setError('Unable to save selection.');
    } finally {
      setSavingSelection(false);
    }
  }

  const hasApplication = portalData?.status !== 'NOT_APPLIED';
  const hasGrades = Boolean(portalData?.grades?.academic_term);
  const isQualified = portalData?.status === 'QUALIFIED';
  const assignment = portalData?.assignment;
  const options = portalData?.training_options || [];
  const uniqueOptions = Array.isArray(options) ? Array.from(new Set(options)) : [];

  return (
    <div className="animate-fofa-in">
      <main className="max-w-4xl w-full mx-auto p-6 -mt-16 mb-20 space-y-6">
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="h-1.5 bg-[#1f2a44] w-full" />
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-[#f0f4f8] p-3 rounded-xl text-[#1f2a44]">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1f2a44] tracking-tight">Student Access Terminal</h3>
                  <p className="text-[11px] text-[#b08d57] uppercase tracking-[0.2em] font-bold">Identity Verification Required</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Student ID"
                  className="bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] font-mono w-40"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkPortal()}
                />
                <button
                  onClick={checkPortal}
                  disabled={loading}
                  className="bg-[#1f2a44] text-white px-6 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-[#b08d57] transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Access'}
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-3 text-red-500 text-[11px] font-bold flex items-center gap-1">
                <XCircle size={12} /> {error}
              </p>
            )}
            {successMessage && (
              <p className="mt-3 text-green-600 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 size={12} /> {successMessage}
              </p>
            )}
          </div>
        </div>

        {portalData && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-fofa-in">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              {[
                { id: 'qualifications', label: 'Qualifications', icon: UserCheck },
                { id: 'apply', label: 'Apply for Training', icon: ClipboardEdit },
                { id: 'assignment', label: 'Firm Assignment', icon: Building },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#b08d57] text-[#1f2a44] bg-white'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? 'text-[#b08d57]' : ''} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-8 space-y-8">
              <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#1f2a44]">Student Portal Overview</h3>
                  <p className="text-[13px] text-gray-600 max-w-2xl">
                    Use your Student ID to access your application status, qualifications, and assignment updates. For the best experience, keep your Student ID handy and refresh your portal after submitting new data.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Current Status</p>
                    <p className="mt-2 text-sm font-semibold text-[#1f2a44]">{portalData.application?.status ?? 'NOT_APPLIED'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Submission Window</p>
                    <p className="mt-2 text-sm font-semibold text-[#1f2a44]">{portalData.submission_open ? 'OPEN' : 'CLOSED'}</p>
                  </div>
                </div>
              </div>

              {activeTab === 'qualifications' && (
                <div className="space-y-6 animate-fofa-in">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-[#1f2a44]">Verified Eligibility Status</h4>
                      <p className="text-sm text-gray-500">Latest review for your current academic term.</p>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">TERM {portalData.academic_term ?? 'N/A'}</span>
                  </div>

                  {!hasApplication && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-[#f8fafc] p-6 text-gray-700">
                      <p className="font-semibold text-[#1f2a44]">No application found yet.</p>
                      <p className="mt-2 text-sm">Start with the Apply tab to submit your application and unlock your qualification results.</p>
                    </div>
                  )}

                  {portalData.status === 'NO_GRADES' && (
                    <div className="rounded-2xl border border-gray-200 bg-[#fef6e7] p-6 text-[#7c5a13]">
                      <p className="font-semibold">Grades are not yet available.</p>
                      <p className="mt-2 text-sm">Your application is registered, but we need your latest grades before we can verify qualification status.</p>
                    </div>
                  )}

                  {portalData.status === 'NOT_QUALIFIED' && (
                    <div className="rounded-2xl border border-gray-200 bg-[#fff1f0] p-6 text-[#9a3412]">
                      <p className="font-semibold">Qualification review completed.</p>
                      <p className="mt-2 text-sm">Your records do not yet meet the qualified standards for placements this term.</p>
                    </div>
                  )}

                  {isQualified && (
                    <div className="grid gap-3">
                      {(portalData.qualified_trainings || []).map((training: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                          <CheckCircle2 className="text-[#b08d57]" size={18} />
                          <div>
                            <p className="font-semibold text-[#1f2a44]">{training.training_name}</p>
                            <p className="text-[13px] text-gray-500">Level {training.level}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {portalData.selection && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Saved Training Choices</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                          <p className="text-[11px] text-gray-500 uppercase">Choice 1</p>
                          <p className="mt-2 font-semibold text-[#1f2a44]">{portalData.selection.training_1 || 'N/A'}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                          <p className="text-[11px] text-gray-500 uppercase">Choice 2</p>
                          <p className="mt-2 font-semibold text-[#1f2a44]">{portalData.selection.training_2 || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'apply' && (
                <div className="space-y-6 animate-fofa-in">
                  <div className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Student ID</p>
                      <p className="mt-2 text-sm font-semibold text-[#1f2a44]">{studentId || 'Enter your ID above'}</p>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Full Name</label>
                      <input
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
                        placeholder="Your full legal name"
                      />
                    </div>
                  </div>

                  {!hasApplication && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-gray-700">
                      <p className="font-semibold text-[#1f2a44]">New Application</p>
                      <p className="mt-2 text-sm text-gray-600">Submit once to register your interest for placement. After applying, you can save your training preferences.</p>
                      <button
                        onClick={submitApplication}
                        disabled={applying}
                        className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#b08d57] px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#1f2a44] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {applying ? <Loader2 size={14} className="animate-spin" /> : 'Submit Application'}
                      </button>
                    </div>
                  )}

                  {hasApplication && !hasGrades && (
                    <div className="rounded-2xl border border-gray-200 bg-[#fff7e6] p-6 text-[#7c5a13]">
                      <p className="font-semibold">Your application is recorded.</p>
                      <p className="mt-2 text-sm">We are waiting for your latest grade entries before qualification review is complete.</p>
                    </div>
                  )}

                  {hasApplication && hasGrades && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6">
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Training Preferences</p>
                          <h4 className="mt-2 text-lg font-bold text-[#1f2a44]">Choose your top two training preferences</h4>
                        </div>
                        <div className="text-sm text-gray-500">You can update this at any time before placement.</div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Preference 1</span>
                          <select
                            value={selection1}
                            onChange={(e) => setSelection1(e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
                          >
                            <option value="">Select first preference</option>
                            {uniqueOptions.map((option: string, index: number) => (
                              <option key={`${option}-${index}`} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Preference 2</span>
                          <select
                            value={selection2}
                            onChange={(e) => setSelection2(e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#b08d57]"
                          >
                            <option value="">Select second preference</option>
                            {uniqueOptions.map((option: string, index: number) => (
                              <option key={`${option}-${index}`} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <button
                        onClick={saveSelection}
                        disabled={savingSelection}
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#1f2a44] px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#b08d57] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingSelection ? <Loader2 size={14} className="animate-spin" /> : 'Save Preferences'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'assignment' && (
                <div className="space-y-6 animate-fofa-in">
                  {assignment ? (
                    <div className="p-6 rounded-2xl bg-[#1f2a44] text-white">
                      <div className="flex items-start justify-between mb-6 gap-4">
                        <div>
                          <p className="text-[10px] text-[#b08d57] font-bold uppercase tracking-[0.2em] mb-1">Current Placement</p>
                          <h4 className="text-xl font-bold">{assignment.firm_name}</h4>
                          <p className="mt-2 text-sm text-white/80">{assignment.firm_city || 'Location unavailable'}</p>
                        </div>
                        <Building size={32} className="text-[#b08d57]" />
                      </div>
                      <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <MapPin size={14} className="text-[#b08d57]" />
                          <span>{assignment.firm_city || 'City not set'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <Calendar size={14} className="text-[#b08d57]" />
                          <span>{assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'Assignment date unknown'}</span>
                        </div>
                      </div>
                      {assignment.training_type && (
                        <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
                          <p className="font-semibold text-white">Assigned Training Type</p>
                          <p className="mt-1 text-white/90">{assignment.training_type}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
                      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                        <Building size={28} className="text-[#b08d57]" />
                      </div>
                      <h4 className="text-lg font-bold text-[#1f2a44]">No firm assignment yet</h4>
                      <p className="mt-3 text-sm text-gray-600">
                        Your application and preferences are on record. Allocation will appear here once your placement is confirmed.
                      </p>
                      <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-gray-500">
                        {portalData.status === 'NOT_APPLIED'
                          ? 'Submit your application to get started.'
                          : portalData.status === 'NO_GRADES'
                          ? 'Waiting for your grades to be verified.'
                          : 'Please check back after the qualification review.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
