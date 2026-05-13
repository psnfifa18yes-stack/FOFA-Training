'use client';

import { useState } from 'react';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  FileText, 
  CheckCircle,
  Loader2,
  Briefcase
} from 'lucide-react';

export default function RegisterFirmPage() {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    industry: 'Architecture',
    training_description: '',
    available_slots: 1,
    duration_weeks: 8,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  async function submitFirm() {
    setLoading(true);
    try {
      const res = await fetch('/api/firm-submit', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => window.location.reload(), 3000);
      } else {
        alert(data.error || "Submission failed.");
      }
    } catch (err) {
      alert("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="animate-fofa-in max-w-2xl mx-auto -mt-16 p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-t-8 border-green-500">
          <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-[#1f2a44] mb-2">Registration Submitted</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Thank you for partnering with the Faculty of Fine Arts. Your application is now under review by the Training Department.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fofa-in">
      <main className="max-w-4xl w-full mx-auto p-6 -mt-16 mb-20">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          
          {/* Header Section */}
          <div className="bg-[#1f2a44] p-8 text-white flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={18} className="text-[#b08d57]" />
                <h3 className="text-lg font-bold tracking-tight uppercase">Firm Partnership Registration</h3>
              </div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Professional Training Network</p>
            </div>
            <Building2 size={40} className="opacity-20" />
          </div>

          <div className="p-8 lg:p-12">
            <p className="text-[13px] text-gray-600 mb-10 leading-relaxed border-l-2 border-[#b08d57] pl-4">
              Register your architectural practice to host students for professional internships. 
              Submissions are reviewed for compliance with Faculty standards.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              {/* Firm Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={14} className="text-[#b08d57]" /> Firm Name
                </label>
                <input type="text" name="name" placeholder="e.g. Allied Architects" onChange={handleChange} 
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <User size={14} className="text-[#b08d57]" /> Contact Person
                </label>
                <input type="text" name="contact_person" placeholder="Full Name" onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <Mail size={14} className="text-[#b08d57]" /> Contact Email
                </label>
                <input type="email" name="contact_email" placeholder="hr@firm.com" onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <Phone size={14} className="text-[#b08d57]" /> Phone Number
                </label>
                <input type="text" name="contact_phone" placeholder="+20..." onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} className="text-[#b08d57]" /> City
                </label>
                <input type="text" name="city" placeholder="e.g. Cairo" onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>

              {/* Slots */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} className="text-[#b08d57]" /> Available Slots
                </label>
                <input type="number" name="available_slots" min="1" defaultValue="1" onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>
            </div>

            {/* Full Width Fields */}
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} className="text-[#b08d57]" /> Office Address
                </label>
                <input type="text" name="address" placeholder="Building, Street, District" onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-[#b08d57] transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1f2a44] uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-[#b08d57]" /> Training Description
                </label>
                <textarea 
                  name="training_description" 
                  placeholder="Summarize architectural software requirements and expected site/office duties..." 
                  rows={4}
                  onChange={handleChange}
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#b08d57] transition-all resize-none"
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              onClick={submitFirm}
              disabled={loading}
              className="w-full md:w-auto md:min-w-[240px] mt-10 bg-[#1f2a44] text-white py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:bg-[#b08d57] hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {loading ? "Processing..." : "Submit Registration"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}