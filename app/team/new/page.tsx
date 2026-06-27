import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { addReportee } from "@/lib/actions";

export default function NewReportee() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Link href="/team" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Team
      </Link>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Add New Reportee</h1>
        
        <form action={addReportee} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</label>
            <input type="text" id="name" name="name" required placeholder="e.g. John Doe" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="text-sm font-medium text-slate-700">Job Role</label>
            <input type="text" id="role" name="role" required placeholder="e.g. Software Engineer" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Work Email</label>
            <input type="email" id="email" name="email" required placeholder="e.g. john@company.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Link href="/team" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">
              Cancel
            </Link>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-shadow shadow-sm">
              Create Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
