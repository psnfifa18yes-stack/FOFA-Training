"use client";

import React from 'react';
import { 
  Building2, 
  GraduationCap, 
  School,
  ArrowRight,
  Briefcase,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function MainPortal() {
  return (
    <div className="animate-fofa-in">
      
      {/* --- GATEWAY CARDS --- */}
      <main className="max-w-5xl w-full mx-auto p-6 md:p-12 -mt-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* STUDENT PORTAL CARD */}
          <Link href="/portal" className="group">
            <div className="bg-white h-full rounded-2xl shadow-xl p-8 border-b-4 border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-[#b08d57] flex flex-col items-center text-center">
              
              {/* Icon Container with Gold Accent */}
              <div className="relative mb-6">
                <div className="bg-[#f0f4f8] w-20 h-20 rounded-xl flex items-center justify-center group-hover:bg-[#1f2a44] transition-colors duration-500">
                  <GraduationCap size={38} className="text-[#1f2a44] group-hover:text-[#b08d57] transition-colors" />
                </div>
                {/* Decorative Gold Corner */}
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#b08d57] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-[#1f2a44] mb-3 flex items-center gap-2">
                <UserCheck size={20} className="text-[#b08d57]" />
                Student Portal
              </h2>
              
              <p className="text-[13px] text-gray-500 mb-8 leading-relaxed max-w-[280px]">
                Verify your academic eligibility, explore verified architectural projects, and manage your internship placement status.
              </p>

              {/* Gold Accent Button Label */}
              <div className="mt-auto py-2 px-6 rounded-full border border-[#b08d57] text-[#b08d57] text-[11px] font-bold group-hover:bg-[#b08d57] group-hover:text-white transition-all uppercase tracking-[0.15em] flex items-center gap-2">
                Enter Portal <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* FIRM PARTNERSHIP CARD */}
          <Link href="/register-firm" className="group">
            <div className="bg-white h-full rounded-2xl shadow-xl p-8 border-b-4 border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-[#b08d57] flex flex-col items-center text-center">
              
              {/* Icon Container with Gold Accent */}
              <div className="relative mb-6">
                <div className="bg-[#f0f4f8] w-20 h-20 rounded-xl flex items-center justify-center group-hover:bg-[#1f2a44] transition-colors duration-500">
                  <Building2 size={38} className="text-[#1f2a44] group-hover:text-[#b08d57] transition-colors" />
                </div>
                {/* Decorative Gold Corner */}
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#b08d57] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-[#1f2a44] mb-3 flex items-center gap-2">
                <Briefcase size={20} className="text-[#b08d57]" />
                Firm Partnership
              </h2>
              
              <p className="text-[13px] text-gray-500 mb-8 leading-relaxed max-w-[280px]">
                Connect your architectural office with the Faculty, post new training vacancies, and review student applications.
              </p>

              {/* Gold Accent Button Label */}
              <div className="mt-auto py-2 px-6 rounded-full border border-[#b08d57] text-[#b08d57] text-[11px] font-bold group-hover:bg-[#b08d57] group-hover:text-white transition-all uppercase tracking-[0.15em] flex items-center gap-2">
                Register Firm <ArrowRight size={14} />
              </div>
            </div>
          </Link>

        </div>
      </main>

      {/* --- ADMIN LOGIN BUTTON (FLOATING) --- */}
      <Link 
        href="/admin/login"
        className="fixed bottom-10 right-10 w-14 h-14 bg-[#1f2a44] text-white rounded-xl flex items-center justify-center shadow-2xl hover:bg-[#b08d57] transition-all group z-50 hover:scale-110 border border-[#b08d57]/30"
      >
        <ShieldCheck size={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute right-16 bg-[#1f2a44] border border-[#b08d57] text-[#b08d57] text-[10px] font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl pointer-events-none tracking-widest uppercase">
          Staff Only
        </span>
      </Link>
      
    </div>
  );
}