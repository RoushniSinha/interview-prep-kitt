import React, { useState } from 'react';
import { Plus, Trash2, Tag, Check, Award } from 'lucide-react';
import { Kit, Requirement } from '../core/types';

interface RequirementsSectionProps {
  kit: Kit;
  onUpdateRole: (updatedRole: Kit['role']) => void;
}

export const RequirementsSection: React.FC<RequirementsSectionProps> = ({
  kit,
  onUpdateRole,
}) => {
  const [newReqText, setNewReqText] = useState('');
  const [newReqKind, setNewReqKind] = useState<'technical' | 'behavioural' | 'domain'>('technical');
  const [newReqPriority, setNewReqPriority] = useState<'must' | 'nice'>('must');
  const [isAdding, setIsAdding] = useState(false);

  const togglePriority = (id: string) => {
    const updated: Requirement[] = kit.role.requirements.map((r) => {
      if (r.id === id) {
        const nextPriority: 'must' | 'nice' = r.priority === 'must' ? 'nice' : 'must';
        return { ...r, priority: nextPriority };
      }
      return r;
    });
    onUpdateRole({ ...kit.role, requirements: updated });
  };

  const deleteReq = (id: string) => {
    const updated = kit.role.requirements.filter((r) => r.id !== id);
    onUpdateRole({ ...kit.role, requirements: updated });
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqText.trim()) return;

    const nextId = `r${kit.role.requirements.length + 1}`;
    const newReq: Requirement = {
      id: nextId,
      text: newReqText.trim(),
      kind: newReqKind,
      priority: newReqPriority,
    };

    onUpdateRole({
      ...kit.role,
      requirements: [...kit.role.requirements, newReq],
    });

    setNewReqText('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Role Profile Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role Specification
            </span>
            <h2 className="text-xl font-bold text-slate-900">{kit.role.title}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>Seniority: <strong className="text-slate-900">{kit.role.seniority}</strong></span>
            <span>·</span>
            <span>Location: <strong className="text-slate-900">{kit.source.location || 'Remote'}</strong></span>
            <span>·</span>
            <span>Requirements: <strong className="text-slate-900">{kit.role.requirements.length}</strong></span>
          </div>
        </div>

        {/* Core Responsibilities */}
        {kit.role.responsibilities && kit.role.responsibilities.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Key Responsibilities
            </h3>
            <ul className="mt-2 space-y-1.5">
              {kit.role.responsibilities.map((resp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Discrete Requirements List */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Extracted Requirements</h3>
            <p className="text-xs text-slate-500">
              Discrete, stable-ID competency matrix linked to interview questions.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Requirement</span>
          </button>
        </div>

        {/* Add Requirement Form */}
        {isAdding && (
          <form
            onSubmit={handleAddRequirement}
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Requirement Description
                </label>
                <input
                  type="text"
                  required
                  value={newReqText}
                  onChange={(e) => setNewReqText(e.target.value)}
                  placeholder="e.g. 5+ years experience building distributed messaging architectures"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Kind</label>
                  <select
                    value={newReqKind}
                    onChange={(e) => setNewReqKind(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioural">Behavioural</option>
                    <option value="domain">Domain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={newReqPriority}
                    onChange={(e) => setNewReqPriority(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="must">Must-Have (Mandatory)</option>
                    <option value="nice">Nice-to-Have (Bonus)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
                >
                  Save Requirement
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Requirements Table */}
        <div className="mt-4 divide-y divide-slate-100">
          {kit.role.requirements.map((req) => (
            <div
              key={req.id}
              className="flex items-start justify-between gap-4 py-3 transition hover:bg-slate-50/50 px-2 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5">
                  {req.id}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{req.text}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{req.kind}</span>
                    <span>·</span>
                    <button
                      onClick={() => togglePriority(req.id)}
                      className={`text-xs font-semibold transition ${
                        req.priority === 'must'
                          ? 'text-rose-600 hover:text-rose-700'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Click to toggle priority between Must and Nice"
                    >
                      {req.priority === 'must' ? 'Must-Have' : 'Nice-to-Have'} (click to toggle)
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => deleteReq(req.id)}
                className="text-slate-300 hover:text-rose-600 p-1 transition"
                title="Remove requirement"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
