'use client';

import {
  useState, useEffect, useMemo, useCallback, Fragment,
} from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Users, Building2, LogOut, LayoutDashboard, GraduationCap, BookOpen,
  Trash2, Edit3, CheckCircle, XCircle, Save, Plus, Download, Settings,
  Search, ShieldAlert, BarChart3, ClipboardList, Zap, Eye, X, AlertCircle, Clock,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Student {
  student_id: string;
  student_name: string;
  faculty_name?: string;
  created_at?: string;
}

interface Firm {
  id: string;
  name: string;
  contact_person: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  available_slots?: number;
  duration_weeks?: number;
  industry?: string;
  training_description?: string;
  status: string;
  created_at?: string;
}

interface Grade {
  id: number;
  student_id: string;
  academic_term: number;
  design_grade?: number | null;
  urban_design_grade?: number | null;
  computer_apps_grade?: number | null;
  workshop_drawings_grade?: number | null;
  technical_installation_grade?: number | null;
  cumulative_gpa?: number | null;
  updated_at?: string;
}

interface TrainingRule {
  id: number;
  subject: string;
  term_min: number;
  term_max: number;
  grade_min: number;
  grade_max: number;
  gpa_min: number;
  training_name: string;
  level: string;
  active: boolean;
}

interface QualifiedTraining {
  id?: number;
  student_id: string;
  academic_term: number;
  training_name: string;
  level: string;
}

interface Selection {
  id: number;
  student_id: string;
  academic_term: number;
  training_1?: string;
  training_2?: string;
  updated_at?: string;
}

interface FirmOpportunity {
  id: string;
  firm_id: string;
  training_type: string;
  available_slots: number;
  created_at?: string;
}

interface Allocation {
  id: string;
  student_id: string;
  firm_id: string;
  opportunity_id?: string;
  assigned_at?: string;
}

interface SystemSettings {
  id: number;
  submission_status: 'OPEN' | 'CLOSED';
  updated_at: string;
}

type ActiveTab = 'stats' | 'students' | 'grades' | 'selections' | 'qualified' | 'rules' | 'firms' | 'settings';
type ActiveSubTab = 'overview' | 'add' | 'allocate';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const DEFAULT_FACULTY = 'Faculty of Fine Arts – New Capital University (FOFA)';

const SUBJECT_FIELD_MAP: Record<string, keyof Grade> = {
  Design: 'design_grade',
  Urban: 'urban_design_grade',
  Computer: 'computer_apps_grade',
  Workshop: 'workshop_drawings_grade',
  Technical: 'technical_installation_grade',
};

const GRADE_FIELDS: Array<{ key: keyof Grade; label: string }> = [
  { key: 'design_grade', label: 'Design Grade' },
  { key: 'urban_design_grade', label: 'Urban Design' },
  { key: 'computer_apps_grade', label: 'Computer Apps' },
  { key: 'workshop_drawings_grade', label: 'Workshop Drawings' },
  { key: 'technical_installation_grade', label: 'Technical Installation' },
  { key: 'cumulative_gpa', label: 'Cumulative GPA' },
];

const TABS = [
  { id: 'stats', icon: LayoutDashboard, label: 'Stats' },
  { id: 'students', icon: Users, label: 'Students' },
  { id: 'grades', icon: BarChart3, label: 'Grades' },
  { id: 'selections', icon: ClipboardList, label: 'Selections' },
  { id: 'qualified', icon: CheckCircle, label: 'Qualified' },
  { id: 'rules', icon: Zap, label: 'Rules' },
  { id: 'firms', icon: Building2, label: 'Firms' },
  { id: 'settings', icon: Settings, label: 'Settings' },
] as const;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Fetches all rows from a Supabase query using cursor-based pagination */
async function fetchAllRows<T>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const allRows: T[] = [];
  let page = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await queryFn(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  return allRows;
}

function fmt(date?: string) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

function fmtDateTime(date?: string) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${styles}`}>
      {status}
    </span>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="p-6 text-center text-slate-400 text-[12px]">
        {message}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function AdminDashboard() {
  const supabase = createClient();

  // ── State ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('overview');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmOpportunities, setFirmOpportunities] = useState<FirmOpportunity[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [rules, setRules] = useState<TrainingRule[]>([]);
  const [qualifiedTrainings, setQualifiedTrainings] = useState<QualifiedTraining[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // UI state
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [expandedFirm, setExpandedFirm] = useState<string | null>(null);
  const [firmToDelete, setFirmToDelete] = useState<string | null>(null);
  const [editingGrades, setEditingGrades] = useState<Grade | null>(null);
  const [editingRule, setEditingRule] = useState<TrainingRule | null>(null);

  // Form state
  const [newStudent, setNewStudent] = useState({
    student_id: '', student_name: '', faculty_name: DEFAULT_FACULTY,
  });
  const [newFirm, setNewFirm] = useState({
    name: '', contact_person: '', contact_email: '', contact_phone: '',
    address: '', city: '', available_slots: '', duration_weeks: '', industry: '',
    training_description: '',
  });
  const [newOpportunity, setNewOpportunity] = useState({
    firm_id: '', training_type: '', available_slots: '',
  });
  const [allocateStudent, setAllocateStudent] = useState({
    student_id: '', firm_id: '', opportunity_id: '',
  });

  // ── Auth guard ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = '/admin/login';
    });
  }, [supabase]);

  // ── Escape key for delete modal ──
  useEffect(() => {
    if (!firmToDelete) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFirmToDelete(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [firmToDelete]);

  // ── Data loading ──
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const studentsData = await fetchAllRows<Student>((from, to) =>
        supabase.from('students').select('*').range(from, to)
      );
      setStudents(studentsData);

      const [firmsData, oppsData, allocsData, gradesData, rulesData, qualifiedData, selectionsData] =
        await Promise.all([
          fetchAllRows<Firm>((from, to) =>
            supabase.from('firms').select('*').order('created_at', { ascending: false }).range(from, to)
          ),
          fetchAllRows<FirmOpportunity>((from, to) =>
            supabase.from('firm_opportunities').select('*').order('created_at', { ascending: false }).range(from, to)
          ),
          fetchAllRows<Allocation>((from, to) =>
            supabase.from('allocations').select('*').range(from, to)
          ),
          fetchAllRows<Grade>((from, to) =>
            supabase.from('grades').select('*').range(from, to)
          ),
          fetchAllRows<TrainingRule>((from, to) =>
            supabase.from('training_rules').select('*').range(from, to)
          ),
          fetchAllRows<QualifiedTraining>((from, to) =>
            supabase.from('qualified_trainings').select('*').range(from, to)
          ),
          fetchAllRows<Selection>((from, to) =>
            supabase.from('selections').select('*').range(from, to)
          ),
        ]);

      setFirms(firmsData);
      setFirmOpportunities(oppsData);
      setAllocations(allocsData);
      setGrades(gradesData);
      setRules(rulesData);
      setQualifiedTrainings(qualifiedData);
      setSelections(selectionsData);

      // System settings — gracefully handle missing row
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();

      setSystemSettings(
        settingsError
          ? { id: 1, submission_status: 'OPEN', updated_at: new Date().toISOString() }
          : settingsData
      );
    } catch (err) {
      console.error('Data Load Error:', err);
      alert('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── Actions ──

  const recomputeQualifications = async () => {
    setLoading(true);
    try {
      const allGrades = await fetchAllRows<Grade>((from, to) =>
        supabase.from('grades').select('*').range(from, to)
      );
      if (!allGrades.length) { alert('No grades found.'); return; }

      const allRules = await fetchAllRows<TrainingRule>((from, to) =>
        supabase.from('training_rules').select('*').eq('active', true).range(from, to)
      );
      if (!allRules.length) { alert('No active rules found.'); return; }

      const newQualifications: QualifiedTraining[] = [];

      for (const grade of allGrades) {
        const applicableRules = allRules.filter(
          (r) => grade.academic_term >= r.term_min && grade.academic_term <= r.term_max
        );

        for (const rule of applicableRules) {
          const fieldKey = SUBJECT_FIELD_MAP[rule.subject];
          const gradeValue = fieldKey ? (grade[fieldKey] as number | null | undefined) : null;
          const gpa = grade.cumulative_gpa ?? 0;

          if (
            gradeValue != null &&
            gradeValue >= rule.grade_min &&
            gpa >= rule.gpa_min
          ) {
            const alreadyExists = newQualifications.some(
              (q) =>
                q.student_id === grade.student_id &&
                q.training_name === rule.training_name &&
                q.academic_term === grade.academic_term
            );
            if (!alreadyExists) {
              newQualifications.push({
                student_id: grade.student_id,
                academic_term: grade.academic_term,
                training_name: rule.training_name,
                level: rule.level,
              });
            }
          }
        }
      }

      // Atomic-ish replace: delete first, then insert in batches
      const { error: deleteError } = await supabase
        .from('qualified_trainings')
        .delete()
        .neq('student_id', '');
      if (deleteError) throw deleteError;

      if (newQualifications.length) {
        for (let i = 0; i < newQualifications.length; i += 500) {
          const { error } = await supabase
            .from('qualified_trainings')
            .insert(newQualifications.slice(i, i + 500));
          if (error) throw error;
        }
        alert(`✓ Stored ${newQualifications.length} qualifications.`);
      } else {
        alert('No qualifications found based on current grades and rules.');
      }

      await loadAllData();
    } catch (err) {
      console.error('Recompute error:', err);
      alert('Error recomputing qualifications. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async () => {
    if (!newStudent.student_id.trim() || !newStudent.student_name.trim()) {
      alert('Student ID and Name are required.');
      return;
    }
    try {
      const { error } = await supabase.from('students').insert([{
        student_id: newStudent.student_id.trim(),
        student_name: newStudent.student_name.trim(),
        faculty_name: newStudent.faculty_name,
      }]);
      if (error) { alert(error.message); return; }
      alert('✓ Student added successfully.');
      setNewStudent({ student_id: '', student_name: '', faculty_name: DEFAULT_FACULTY });
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const saveGrade = async () => {
    if (!editingGrades) return;
    try {
      const { error } = await supabase.from('grades').upsert([{
        ...editingGrades,
        updated_at: new Date().toISOString(),
      }]);
      if (error) { alert(error.message); return; }
      alert('✓ Grades saved.');
      setEditingGrades(null);
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const addFirm = async () => {
    if (!newFirm.name.trim() || !newFirm.contact_person.trim() || !newFirm.contact_email.trim()) {
      alert('Firm name, contact person, and email are required.');
      return;
    }
    try {
      const { error } = await supabase.from('firms').insert([{
        ...newFirm,
        available_slots: newFirm.available_slots ? parseInt(newFirm.available_slots) : null,
        duration_weeks: newFirm.duration_weeks ? parseInt(newFirm.duration_weeks) : null,
        status: 'PENDING',
      }]);
      if (error) { alert(error.message); return; }
      alert('✓ Firm added successfully.');
      setNewFirm({
        name: '', contact_person: '', contact_email: '', contact_phone: '',
        address: '', city: '', available_slots: '', duration_weeks: '',
        industry: '', training_description: '',
      });
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const addFirmOpportunity = async () => {
    if (!newOpportunity.firm_id || !newOpportunity.training_type.trim() || !newOpportunity.available_slots) {
      alert('All opportunity fields are required.');
      return;
    }
    const slots = parseInt(newOpportunity.available_slots);
    if (isNaN(slots) || slots < 1) { alert('Slots must be a positive number.'); return; }

    try {
      const { error } = await supabase.from('firm_opportunities').insert([{
        firm_id: newOpportunity.firm_id,
        training_type: newOpportunity.training_type.trim(),
        available_slots: slots,
        created_at: new Date().toISOString(),
      }]);
      if (error) { alert(error.message); return; }
      alert('✓ Opportunity added.');
      setNewOpportunity({ firm_id: newOpportunity.firm_id, training_type: '', available_slots: '' });
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const deleteFirm = async (firmId: string) => {
    try {
      const { error } = await supabase.from('firms').delete().eq('id', firmId);
      if (error) { alert(error.message); return; }
      alert('✓ Firm deleted.');
      setFirmToDelete(null);
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const updateFirmStatus = async (firmId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('firms').update({ status: newStatus }).eq('id', firmId);
      if (error) { alert(error.message); return; }
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const allocateStudentToFirm = async () => {
    if (!allocateStudent.student_id || !allocateStudent.firm_id) {
      alert('Select both a student and a firm.');
      return;
    }
    const opps = firmOpportunities.filter((o) => o.firm_id === allocateStudent.firm_id);
    if (opps.length && !allocateStudent.opportunity_id) {
      alert('This firm has defined opportunities — please select one.');
      return;
    }
    try {
      const payload: Omit<Allocation, 'id'> = {
        student_id: allocateStudent.student_id,
        firm_id: allocateStudent.firm_id,
        assigned_at: new Date().toISOString(),
        ...(allocateStudent.opportunity_id ? { opportunity_id: allocateStudent.opportunity_id } : {}),
      };
      const { error } = await supabase.from('allocations').insert([payload]);
      if (error) { alert(error.message); return; }
      alert('✓ Student allocated successfully.');
      setAllocateStudent({ student_id: '', firm_id: '', opportunity_id: '' });
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const saveRule = async () => {
    if (!editingRule) return;
    try {
      const { error } = await supabase.from('training_rules').update({
        grade_min: editingRule.grade_min,
        gpa_min: editingRule.gpa_min,
      }).eq('id', editingRule.id);
      if (error) { alert(error.message); return; }
      alert('✓ Rule updated.');
      setEditingRule(null);
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const toggleSubmissions = async () => {
    const newStatus = systemSettings?.submission_status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const { error } = await supabase.from('system_settings').update({
        submission_status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', 1);
      if (error) { alert(error.message); return; }
      loadAllData();
    } catch (err) { console.error(err); }
  };

  const exportQualifiedCSV = useCallback(() => {
    const termFiltered = qualifiedTrainings.filter((q) => q.academic_term === selectedTerm);
    if (!termFiltered.length) { alert(`No qualified data for Term ${selectedTerm}.`); return; }

    const headers = ['Student ID', 'Training Name', 'Level', 'Academic Term'];
    const rows = termFiltered.map((q) => [q.student_id, q.training_name, q.level, q.academic_term]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qualified-term-${selectedTerm}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [qualifiedTrainings, selectedTerm]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  // ── Derived / memoized values ──

  const filteredStudents = useMemo(
    () => students.filter(
      (s) =>
        s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [students, searchTerm]
  );

  const filteredFirms = useMemo(
    () => firms.filter(
      (f) =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.industry?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [firms, searchTerm]
  );

  const filteredGrades = useMemo(
    () => grades.filter(
      (g) =>
        g.academic_term === selectedTerm &&
        g.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [grades, searchTerm, selectedTerm]
  );

  const filteredQualified = useMemo(
    () => qualifiedTrainings.filter(
      (q) =>
        q.academic_term === selectedTerm &&
        (
          q.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.training_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ),
    [qualifiedTrainings, searchTerm, selectedTerm]
  );

  const filteredSelections = useMemo(
    () => selections.filter(
      (s) =>
        s.academic_term === selectedTerm &&
        s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [selections, searchTerm, selectedTerm]
  );

  const filteredRules = useMemo(
    () => rules.filter(
      (r) =>
        r.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.training_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [rules, searchTerm]
  );

  const currentFirmOpportunities = useMemo(
    () => firmOpportunities.filter((o) => o.firm_id === allocateStudent.firm_id),
    [firmOpportunities, allocateStudent.firm_id]
  );

  const stats = useMemo(() => ({
    totalStudents: students.length,
    withGrades: grades.length,
    qualified: qualifiedTrainings.length,
    selections: selections.length,
    totalAllocations: allocations.length,
  }), [students, grades, qualifiedTrainings, selections, allocations]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 z-[300] flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl text-[12px] font-semibold text-slate-700 flex items-center gap-3">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full" />
            Loading…
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-amber-500" size={24} />
            <div>
              <h1 className="text-sm font-black tracking-[0.3em] uppercase text-slate-900">FOFA Manager</h1>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* ── Tab bar ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white shadow-xl border border-gray-100 rounded-3xl mt-6 px-4 py-3 flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as ActiveTab); setSearchTerm(''); }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-100 text-slate-900 border border-amber-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-amber-500' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ── Toolbar (search + controls) ── */}
        {activeTab !== 'stats' && (
          <div className="bg-white border border-slate-200 p-4 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search…"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] outline-none focus:ring-2 focus:ring-amber-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Term selector — only relevant tabs */}
            {['grades', 'selections', 'qualified'].includes(activeTab) && (
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                className="min-w-[120px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] outline-none"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
                  <option key={t} value={t}>Term {t}</option>
                ))}
              </select>
            )}

            {activeTab === 'qualified' && (
              <button
                onClick={exportQualifiedCSV}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 transition-colors"
              >
                <Download size={14} /> Export CSV
              </button>
            )}

            {!['firms', 'settings'].includes(activeTab) && (
              <button
                onClick={recomputeQualifications}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 transition-colors"
              >
                <Zap size={14} /> Recompute
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            STATS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Students', value: stats.totalStudents, icon: Users },
                { label: 'With Grades', value: stats.withGrades, icon: BarChart3 },
                { label: 'Qualified', value: stats.qualified, icon: GraduationCap },
                { label: 'Selections', value: stats.selections, icon: ClipboardList },
                { label: 'Allocations', value: stats.totalAllocations, icon: Building2 },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                    <stat.icon className="text-slate-400" size={18} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                <h3 className="text-[12px] font-semibold uppercase text-slate-700 mb-4 flex items-center gap-2">
                  <Zap size={16} /> Portal Status
                </h3>
                <div className={`inline-block px-4 py-2 rounded-full font-semibold text-[11px] ${
                  systemSettings?.submission_status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  ◉ {systemSettings?.submission_status ?? '…'}
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                <h3 className="text-[12px] font-semibold uppercase text-slate-700 mb-4 flex items-center gap-2">
                  <Clock size={16} /> Last Updated
                </h3>
                <p className="text-[12px] text-slate-600">{fmtDateTime(systemSettings?.updated_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STUDENTS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Sub-tab bar */}
            <div className="flex gap-3 bg-white border border-slate-200 p-4 rounded-xl">
              {(['overview', 'add', 'allocate'] as ActiveSubTab[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveSubTab(st)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                    activeSubTab === st ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {st === 'overview' ? 'Overview' : st === 'add' ? 'Add Student' : 'Allocate'}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeSubTab === 'overview' && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-4 font-semibold text-slate-600">ID</th>
                        <th className="p-4 font-semibold text-slate-600">Name</th>
                        <th className="p-4 font-semibold text-slate-600">Faculty</th>
                        <th className="p-4 font-semibold text-slate-600">Created</th>
                        <th className="p-4 font-semibold text-slate-600">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <EmptyRow cols={5} message="No students found." />
                      ) : (
                        filteredStudents.map((s) => (
                          <Fragment key={s.student_id}>
                            <tr className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-mono font-semibold text-slate-800">{s.student_id}</td>
                              <td className="p-4">{s.student_name}</td>
                              <td className="p-4 text-[11px] text-slate-500">{s.faculty_name ? 'FOFA' : 'N/A'}</td>
                              <td className="p-4 text-[11px] text-slate-500">{fmt(s.created_at)}</td>
                              <td className="p-4">
                                <button
                                  onClick={() => setExpandedStudent(expandedStudent === s.student_id ? null : s.student_id)}
                                  className="text-slate-400 hover:text-slate-700 transition-colors"
                                  title={expandedStudent === s.student_id ? 'Collapse' : 'Expand'}
                                >
                                  {expandedStudent === s.student_id ? <X size={16} /> : <Eye size={16} />}
                                </button>
                              </td>
                            </tr>
                            {expandedStudent === s.student_id && (
                              <tr>
                                <td colSpan={5} className="bg-slate-50 border-b">
                                  <div className="p-6 grid md:grid-cols-2 gap-4 text-[11px]">
                                    <div><span className="text-slate-500 font-semibold">Student ID:</span> {s.student_id}</div>
                                    <div><span className="text-slate-500 font-semibold">Full Name:</span> {s.student_name}</div>
                                    <div><span className="text-slate-500 font-semibold">Faculty:</span> {s.faculty_name || 'N/A'}</div>
                                    <div><span className="text-slate-500 font-semibold">Registered:</span> {fmt(s.created_at)}</div>
                                    <div>
                                      <span className="text-slate-500 font-semibold">Allocations:</span>{' '}
                                      {allocations.filter((a) => a.student_id === s.student_id).length}
                                    </div>
                                    <div>
                                      <span className="text-slate-500 font-semibold">Grades entries:</span>{' '}
                                      {grades.filter((g) => g.student_id === s.student_id).length}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add Student */}
            {activeSubTab === 'add' && (
              <div className="bg-white border border-slate-200 p-6 rounded-xl max-w-md">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-[13px]">
                  <Plus size={16} /> Add New Student
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Student ID *"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                    value={newStudent.student_id}
                    onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Full Name *"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                    value={newStudent.student_name}
                    onChange={(e) => setNewStudent({ ...newStudent, student_name: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                    Faculty: {newStudent.faculty_name}
                  </p>
                  <button
                    onClick={addStudent}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors"
                  >
                    Add Student
                  </button>
                </div>
              </div>
            )}

            {/* Allocate */}
            {activeSubTab === 'allocate' && (
              <div className="bg-white border border-slate-200 p-6 rounded-xl max-w-md">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-[13px]">
                  <Building2 size={16} /> Allocate Student to Firm
                </h3>
                <div className="space-y-4">
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none"
                    value={allocateStudent.student_id}
                    onChange={(e) => setAllocateStudent({ ...allocateStudent, student_id: e.target.value })}
                  >
                    <option value="">Select Student…</option>
                    {students.map((s) => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.student_name} ({s.student_id})
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none"
                    value={allocateStudent.firm_id}
                    onChange={(e) => setAllocateStudent({ ...allocateStudent, firm_id: e.target.value, opportunity_id: '' })}
                  >
                    <option value="">Select Firm…</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  {currentFirmOpportunities.length > 0 && (
                    <>
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none"
                        value={allocateStudent.opportunity_id}
                        onChange={(e) => setAllocateStudent({ ...allocateStudent, opportunity_id: e.target.value })}
                      >
                        <option value="">Select Training Opportunity…</option>
                        {currentFirmOpportunities.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.training_type} — {o.available_slots} slot{o.available_slots === 1 ? '' : 's'}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">
                        Select an opportunity to enforce slot limits.
                      </p>
                    </>
                  )}

                  {currentFirmOpportunities.length === 0 && allocateStudent.firm_id && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                      No opportunities defined for this firm. Allocation will proceed without slot enforcement.
                    </p>
                  )}

                  <button
                    onClick={allocateStudentToFirm}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors"
                  >
                    Allocate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            GRADES TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'grades' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Student ID', 'Design', 'Urban', 'Computer', 'Workshop', 'Technical', 'GPA', 'Edit'].map((h) => (
                      <th key={h} className="p-3 font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGrades.length === 0 ? (
                    <EmptyRow cols={8} message={`No grades found for Term ${selectedTerm}.`} />
                  ) : (
                    filteredGrades.map((g) => (
                      <tr key={g.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-800">{g.student_id}</td>
                        <td className="p-3">{g.design_grade ?? '—'}</td>
                        <td className="p-3">{g.urban_design_grade ?? '—'}</td>
                        <td className="p-3">{g.computer_apps_grade ?? '—'}</td>
                        <td className="p-3">{g.workshop_drawings_grade ?? '—'}</td>
                        <td className="p-3">{g.technical_installation_grade ?? '—'}</td>
                        <td className="p-3 font-semibold">{g.cumulative_gpa ?? '—'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => setEditingGrades(g)}
                            className="text-blue-400 hover:text-blue-600 transition-colors"
                            title="Edit grades"
                          >
                            <Edit3 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Inline grade editor */}
            {editingGrades && (
              <div className="bg-slate-50 border-t p-6">
                <h4 className="font-semibold mb-4 text-[13px]">Editing: {editingGrades.student_id}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {GRADE_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">{label}</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                        value={(editingGrades as any)[key] ?? ''}
                        onChange={(e) =>
                          setEditingGrades({
                            ...editingGrades,
                            [key]: e.target.value === '' ? null : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveGrade}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-[11px] font-bold uppercase transition-colors"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button
                    onClick={() => setEditingGrades(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-[11px] font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            SELECTIONS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'selections' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Student ID', '1st Choice', '2nd Choice', 'Updated'].map((h) => (
                      <th key={h} className="p-4 font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSelections.length === 0 ? (
                    <EmptyRow cols={4} message={`No selections for Term ${selectedTerm}.`} />
                  ) : (
                    filteredSelections.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-semibold text-slate-800">{s.student_id}</td>
                        <td className="p-4">{s.training_1 || '—'}</td>
                        <td className="p-4">{s.training_2 || '—'}</td>
                        <td className="p-4 text-[11px] text-slate-500">{fmt(s.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            QUALIFIED TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'qualified' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Student ID', 'Training Name', 'Level'].map((h) => (
                      <th key={h} className="p-4 font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQualified.length === 0 ? (
                    <EmptyRow cols={3} message={`No qualified trainings for Term ${selectedTerm}.`} />
                  ) : (
                    filteredQualified.map((q, i) => (
                      // Use composite key for stability; fall back to index only if id is missing
                      <tr key={q.id ?? `${q.student_id}-${q.training_name}-${i}`} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-semibold text-slate-800">{q.student_id}</td>
                        <td className="p-4">{q.training_name}</td>
                        <td className="p-4">
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full">
                            {q.level}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            RULES TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Subject', 'Training', 'Level', 'Grade Min', 'GPA Min', 'Terms', 'Active', 'Edit'].map((h) => (
                      <th key={h} className="p-3 font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.length === 0 ? (
                    <EmptyRow cols={8} message="No rules found." />
                  ) : (
                    filteredRules.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold">{r.subject}</td>
                        <td className="p-3">{r.training_name}</td>
                        <td className="p-3">{r.level}</td>
                        <td className="p-3">{r.grade_min}</td>
                        <td className="p-3">{r.gpa_min}</td>
                        <td className="p-3 text-[10px] text-slate-500">{r.term_min}–{r.term_max}</td>
                        <td className="p-3">
                          {r.active
                            ? <CheckCircle className="text-emerald-500" size={14} />
                            : <XCircle className="text-slate-400" size={14} />}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setEditingRule(r)}
                            className="text-blue-400 hover:text-blue-600 transition-colors"
                            title="Edit rule"
                          >
                            <Edit3 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {editingRule && (
              <div className="bg-slate-50 border-t p-6">
                <h4 className="font-semibold mb-4 text-[13px]">Editing Rule: {editingRule.subject} → {editingRule.training_name}</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">Grade Min</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                      value={editingRule.grade_min}
                      onChange={(e) => setEditingRule({ ...editingRule, grade_min: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-semibold block mb-1">GPA Min</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                      value={editingRule.gpa_min}
                      onChange={(e) => setEditingRule({ ...editingRule, gpa_min: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveRule}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-[11px] font-bold uppercase transition-colors"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button
                    onClick={() => setEditingRule(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-[11px] font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            FIRMS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'firms' && (
          <div className="space-y-6">
            {/* Add firm + overview cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Add Firm form */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-[13px]">
                  <Plus size={16} /> Add New Firm
                </h3>
                <div className="space-y-3">
                  {[
                    { placeholder: 'Firm Name *', key: 'name', type: 'text' },
                    { placeholder: 'Contact Person *', key: 'contact_person', type: 'text' },
                    { placeholder: 'Email *', key: 'contact_email', type: 'email' },
                    { placeholder: 'Phone', key: 'contact_phone', type: 'tel' },
                    { placeholder: 'City', key: 'city', type: 'text' },
                    { placeholder: 'Industry', key: 'industry', type: 'text' },
                    { placeholder: 'Address', key: 'address', type: 'text' },
                    { placeholder: 'Available Slots', key: 'available_slots', type: 'number' },
                    { placeholder: 'Duration (weeks)', key: 'duration_weeks', type: 'number' },
                  ].map(({ placeholder, key, type }) => (
                    <input
                      key={key}
                      type={type}
                      placeholder={placeholder}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                      value={(newFirm as any)[key]}
                      onChange={(e) => setNewFirm({ ...newFirm, [key]: e.target.value })}
                    />
                  ))}
                  <textarea
                    placeholder="Training Description"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                    value={newFirm.training_description}
                    onChange={(e) => setNewFirm({ ...newFirm, training_description: e.target.value })}
                  />
                  <button
                    onClick={addFirm}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors"
                  >
                    Add Firm
                  </button>
                </div>
              </div>

              {/* Status overview */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <h3 className="font-semibold mb-4 text-[13px]">Firm Status Overview</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Firms', value: firms.length, color: 'text-slate-900' },
                    { label: 'Pending', value: firms.filter((f) => f.status === 'PENDING').length, color: 'text-yellow-600' },
                    { label: 'Approved', value: firms.filter((f) => f.status === 'APPROVED').length, color: 'text-emerald-600' },
                    { label: 'Rejected', value: firms.filter((f) => f.status === 'REJECTED').length, color: 'text-red-500' },
                    { label: 'Opportunities', value: firmOpportunities.length, color: 'text-slate-900' },
                    { label: 'Assignments', value: allocations.length, color: 'text-slate-900' },
                    {
                      label: 'Total Remaining Slots',
                      value: firmOpportunities.reduce((s, o) => s + (o.available_slots ?? 0), 0),
                      color: 'text-slate-900',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center text-[12px] border-b border-slate-100 pb-2 last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Firms table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      {['Firm Name', 'Contact', 'City', 'Slots', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="p-3 font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFirms.length === 0 ? (
                      <EmptyRow cols={6} message="No firms found." />
                    ) : (
                      filteredFirms.map((f) => {
                        const oppsForFirm = firmOpportunities.filter((o) => o.firm_id === f.id);
                        const totalRemaining = oppsForFirm.reduce((s, o) => s + (o.available_slots ?? 0), 0);
                        const assigned = allocations
                          .filter((a) => a.firm_id === f.id)
                          .map((a) => {
                            const st = students.find((s) => s.student_id === a.student_id);
                            return {
                              label: st ? `${st.student_name} (${st.student_id})` : a.student_id,
                              opp: firmOpportunities.find((o) => o.id === a.opportunity_id)?.training_type || 'Firm-level',
                            };
                          });

                        return (
                          <Fragment key={f.id}>
                            <tr className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-800">{f.name}</td>
                              <td className="p-3 text-[10px] text-slate-600">{f.contact_person}</td>
                              <td className="p-3">{f.city || '—'}</td>
                              <td className="p-3">{f.available_slots ?? '—'}</td>
                              <td className="p-3">
                                <select
                                  value={f.status}
                                  onChange={(e) => updateFirmStatus(f.id, e.target.value)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border-0 outline-none cursor-pointer ${
                                    f.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : f.status === 'PENDING'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-600'
                                  }`}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="APPROVED">Approved</option>
                                  <option value="REJECTED">Rejected</option>
                                </select>
                              </td>
                              <td className="p-3 flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    setExpandedFirm(expandedFirm === f.id ? null : f.id);
                                    setNewOpportunity({ firm_id: f.id, training_type: '', available_slots: '' });
                                  }}
                                  className="text-slate-400 hover:text-slate-700 transition-colors"
                                  title="View details"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => setFirmToDelete(f.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                  title="Delete firm"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>

                            {/* Expanded firm details */}
                            {expandedFirm === f.id && (
                              <tr>
                                <td colSpan={6} className="bg-slate-50 border-b">
                                  <div className="p-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                                    {/* Left column */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-lg font-bold">{f.name}</h4>
                                        <p className="text-[12px] text-slate-500">
                                          {f.industry || 'Industry not specified'} · {f.city || 'City not specified'}
                                        </p>
                                      </div>

                                      <div className="grid sm:grid-cols-2 gap-3">
                                        <div className="rounded-2xl border bg-white p-4">
                                          <p className="text-[10px] uppercase text-slate-500 font-semibold mb-2">Contact</p>
                                          <p className="font-semibold text-[12px]">{f.contact_person}</p>
                                          <p className="text-[12px] text-slate-600">{f.contact_email}</p>
                                          {f.contact_phone && <p className="text-[12px] text-slate-600">{f.contact_phone}</p>}
                                        </div>
                                        <div className="rounded-2xl border bg-white p-4">
                                          <p className="text-[10px] uppercase text-slate-500 font-semibold mb-2">Capacity</p>
                                          <p className="text-[12px]">
                                            {oppsForFirm.length
                                              ? `${totalRemaining} slots across ${oppsForFirm.length} opportunit${oppsForFirm.length === 1 ? 'y' : 'ies'}`
                                              : `${f.available_slots ?? 0} firm slots`}
                                          </p>
                                          <p className="text-[11px] text-slate-500 mt-1">
                                            {f.duration_weeks ? `${f.duration_weeks} weeks` : 'Duration not set'}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="rounded-2xl border bg-white p-4">
                                        <p className="text-[10px] uppercase text-slate-500 font-semibold mb-2">Assigned Students</p>
                                        {assigned.length ? (
                                          <ul className="space-y-2 mt-1">
                                            {assigned.map((a, idx) => (
                                              <li key={idx} className="rounded-xl border bg-slate-50 p-3">
                                                <p className="font-semibold text-[12px]">{a.label}</p>
                                                <p className="text-[11px] text-slate-500">{a.opp}</p>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[12px] text-slate-400 mt-1">No students assigned yet.</p>
                                        )}
                                      </div>

                                      {f.training_description && (
                                        <div className="rounded-2xl border bg-white p-4">
                                          <p className="text-[10px] uppercase text-slate-500 font-semibold mb-2">Description</p>
                                          <p className="text-[12px] text-slate-700">{f.training_description}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right column — opportunities */}
                                    <div className="space-y-4">
                                      <div className="rounded-2xl border bg-white p-4">
                                        <div className="flex justify-between items-start mb-3">
                                          <div>
                                            <p className="text-[10px] uppercase text-slate-500 font-semibold">Training Opportunities</p>
                                            <h4 className="text-base font-semibold">
                                              {oppsForFirm.length} opportunit{oppsForFirm.length === 1 ? 'y' : 'ies'}
                                            </h4>
                                          </div>
                                          <span className="text-[11px] text-slate-500">{totalRemaining} remaining</span>
                                        </div>

                                        {oppsForFirm.length ? (
                                          <div className="space-y-2">
                                            {oppsForFirm.map((o) => {
                                              const assignedToOpp = allocations
                                                .filter((a) => a.opportunity_id === o.id)
                                                .map((a) => students.find((s) => s.student_id === a.student_id))
                                                .filter(Boolean)
                                                .map((s) => `${s!.student_name} (${s!.student_id})`);
                                              return (
                                                <div key={o.id} className="rounded-xl border bg-slate-50 p-3">
                                                  <p className="font-semibold text-[12px]">{o.training_type}</p>
                                                  <p className="text-[11px] text-slate-500">
                                                    Assigned: {assignedToOpp.length} · Remaining: {o.available_slots}
                                                  </p>
                                                  {assignedToOpp.length > 0 && (
                                                    <p className="text-[11px] text-slate-600 mt-1">
                                                      {assignedToOpp.join(', ')}
                                                    </p>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <p className="text-[12px] text-slate-400">No opportunities yet. Add one below.</p>
                                        )}
                                      </div>

                                      {/* Add opportunity form */}
                                      <div className="rounded-2xl border bg-white p-4">
                                        <h4 className="font-semibold mb-3 text-[12px]">Add Training Opportunity</h4>
                                        <div className="space-y-3">
                                          <input
                                            type="text"
                                            placeholder="Training Type"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                                            value={newOpportunity.training_type}
                                            onChange={(e) => setNewOpportunity({ ...newOpportunity, training_type: e.target.value })}
                                          />
                                          <input
                                            type="number"
                                            placeholder="Available Slots"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[12px] outline-none focus:ring-2 focus:ring-amber-200"
                                            value={newOpportunity.available_slots}
                                            onChange={(e) => setNewOpportunity({ ...newOpportunity, available_slots: e.target.value })}
                                          />
                                          <button
                                            onClick={addFirmOpportunity}
                                            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-colors"
                                          >
                                            Add Opportunity
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            SETTINGS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white border border-slate-200 p-8 rounded-xl text-center">
              <ShieldAlert size={40} className="mx-auto text-amber-500 mb-4" />
              <h3 className="text-lg font-bold mb-2">Portal Controls</h3>
              <p className="text-[11px] text-slate-500 mb-6">
                Toggle student submission access for the entire platform.
              </p>
              <button
                onClick={toggleSubmissions}
                className={`w-full py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-colors ${
                  systemSettings?.submission_status === 'OPEN'
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {systemSettings?.submission_status === 'OPEN' ? '◉ Close Portal' : '◉ Open Portal'}
              </button>
              <p className="text-[11px] text-slate-500 mt-4">
                Current Status:{' '}
                <span className={`font-bold ${systemSettings?.submission_status === 'OPEN' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {systemSettings?.submission_status ?? '…'}
                </span>
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Last changed: {fmtDateTime(systemSettings?.updated_at)}</p>
            </div>
          </div>
        )}
      </main>

      {/* ── Delete confirmation modal ── */}
      {firmToDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]"
          onClick={(e) => { if (e.target === e.currentTarget) setFirmToDelete(null); }}
        >
          <div className="bg-white border border-slate-200 p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-slate-800">
              <AlertCircle size={18} className="text-red-500" /> Confirm Deletion
            </h3>
            <p className="text-slate-500 text-[12px] mb-1">
              You are about to delete: <span className="font-bold text-slate-800">{firms.find((f) => f.id === firmToDelete)?.name}</span>
            </p>
            <p className="text-slate-400 text-[11px] mb-6">This will also remove associated opportunities and allocations. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteFirm(firmToDelete)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setFirmToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}