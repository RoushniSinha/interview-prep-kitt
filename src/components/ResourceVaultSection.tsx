import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Code2,
  Brain,
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Copy,
  Check,
  Tag,
  ArrowUpRight,
  RotateCw,
  FolderGit2,
  TrendingUp,
  Layers,
  Award,
  Terminal,
} from 'lucide-react';
import { Kit } from '../core/types';
import {
  ResourceItem,
  ResourceCategory,
  loadVaultResources,
  saveVaultResources,
  calculateVaultStats,
  generateAutoCuratedResources,
} from '../core/resourceVault';
import { CliDocumentationHub } from './CliDocumentationHub';

interface ResourceVaultSectionProps {
  kit: Kit;
}

export const ResourceVaultSection: React.FC<ResourceVaultSectionProps> = ({ kit }) => {
  const [resources, setResources] = useState<ResourceItem[]>(() => loadVaultResources(kit));
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all' | 'bookmarked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'to_read' | 'reading' | 'completed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form states for custom resource
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ResourceCategory>('industry_article');
  const [newUrl, setNewUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newReadTime, setNewReadTime] = useState('7 min read');
  const [newDifficulty, setNewDifficulty] = useState<'Foundational' | 'Intermediate' | 'Staff / Advanced'>('Intermediate');
  const [newDescription, setNewDescription] = useState('');
  const [newTakeaways, setNewTakeaways] = useState('');
  const [newTags, setNewTags] = useState('');

  // Persist whenever resources change
  useEffect(() => {
    saveVaultResources(kit.source.company, resources);
  }, [resources, kit.source.company]);

  const stats = useMemo(() => calculateVaultStats(resources), [resources]);

  // Filtered list
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      // Category filter
      if (activeCategory === 'bookmarked') {
        if (!item.isBookmarked) return false;
      } else if (activeCategory !== 'all') {
        if (item.category !== activeCategory) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesSource = item.sourceName.toLowerCase().includes(q);
        const matchesTag = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchesTakeaways = item.keyTakeaways.some((k) => k.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesSource && !matchesTag && !matchesTakeaways) {
          return false;
        }
      }

      return true;
    });
  }, [resources, activeCategory, statusFilter, searchQuery]);

  const handleToggleBookmark = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isBookmarked: !r.isBookmarked } : r))
    );
  };

  const handleStatusChange = (id: string, newStatus: 'to_read' | 'reading' | 'completed') => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleDeleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetToAutoCurated = () => {
    const fresh = generateAutoCuratedResources(kit);
    setResources(fresh);
    setFeedbackMsg('✓ Re-curated vault based on latest job description requirements.');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleCopySummary = (item: ResourceItem) => {
    const text = [
      `### ${item.title} (${item.sourceName})`,
      `Category: ${item.category} | Read time: ${item.readTime} | Difficulty: ${item.difficulty}`,
      `URL: ${item.url}`,
      `\nDescription:\n${item.description}`,
      `\nKey Takeaways:\n${item.keyTakeaways.map((t) => `- ${t}`).join('\n')}`,
      `Tags: ${item.tags.join(', ')}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdownList = () => {
    const md = [
      `# ${kit.source.company} · Resource Vault & Tactical Reference Library`,
      `Role: ${kit.role.title}`,
      `Generated at: ${new Date().toISOString()}`,
      `\n## Executive Summary`,
      `- Total Curated Resources: ${stats.total}`,
      `- Bookmarked Guides: ${stats.bookmarkedCount}`,
      `- Completed Reading: ${stats.completedCount} (${Math.round((stats.completedCount / (stats.total || 1)) * 100)}%)`,
      `\n---\n`,
      ...resources.map((r, i) => {
        return [
          `### ${i + 1}. [${r.title}](${r.url})`,
          `- **Category:** ${r.category.replace('_', ' ').toUpperCase()}`,
          `- **Publisher:** ${r.sourceName}`,
          `- **Read Time & Level:** ${r.readTime} · ${r.difficulty}`,
          `- **Status:** ${r.status.toUpperCase()} ${r.isBookmarked ? '★ Bookmarked' : ''}`,
          `- **Matched Requirement:** ${r.matchedRequirement || 'General'}`,
          `\n**Overview:** ${r.description}\n`,
          `**Key Architectural & Tactical Takeaways:**`,
          ...r.keyTakeaways.map((k) => `  * ${k}`),
          `\n**Tags:** \`${r.tags.join('`, `')}\`\n`,
        ].join('\n');
      }),
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kit.source.company.toLowerCase()}_resource_vault.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const customItem: ResourceItem = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      sourceName: newSourceName.trim() || 'Custom Reference',
      url: newUrl.trim() || 'https://google.com',
      readTime: newReadTime.trim() || '5 min read',
      difficulty: newDifficulty,
      relevanceScore: 90,
      matchedRequirement: 'Custom Candidate Bookmark',
      description: newDescription.trim() || 'User bookmarked article/guide for interview preparation.',
      keyTakeaways: newTakeaways
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isBookmarked: true,
      status: 'to_read',
      isCustom: true,
    };

    setResources((prev) => [customItem, ...prev]);
    setIsAddingCustom(false);

    // Reset form
    setNewTitle('');
    setNewUrl('');
    setNewSourceName('');
    setNewDescription('');
    setNewTakeaways('');
    setNewTags('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Curated Knowledge Engine
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {kit.source.company} · {kit.role.title}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <span>Resource Vault & Tactical Reference Library</span>
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl mt-1 leading-relaxed">
              Auto-bookmarked industry whitepapers, high-scale engineering architecture blogs, algorithmic coding blueprints, and executive behavioral technique guides calibrated directly to this job description.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportMarkdownList}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              title="Download entire library as formatted markdown"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Reading List</span>
            </button>

            <button
              type="button"
              onClick={handleResetToAutoCurated}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              title="Re-curate from role requirements"
            >
              <RotateCw className="h-3.5 w-3.5 text-slate-400" />
              <span>Re-Curate</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Bookmark Custom Link</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Metrics Bar */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-b border-slate-100 pb-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-medium text-slate-500">Total Curated Resources</span>
            <p className="font-mono text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
            <span className="text-[10px] text-slate-400">Targeted to role</span>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <span className="text-[11px] font-medium text-amber-800">Bookmarked Key Guides</span>
            <p className="font-mono text-xl font-bold text-amber-900 mt-0.5">{stats.bookmarkedCount}</p>
            <span className="text-[10px] text-amber-700">Starred for review</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <span className="text-[11px] font-medium text-emerald-800">Completed Reading</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="font-mono text-xl font-bold text-emerald-900">
                {stats.completedCount} / {stats.total}
              </p>
              <span className="text-[11px] font-semibold text-emerald-700">
                ({Math.round((stats.completedCount / (stats.total || 1)) * 100)}%)
              </span>
            </div>
            <span className="text-[10px] text-emerald-700">Readiness progress</span>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
            <span className="text-[11px] font-medium text-indigo-800">Category Balance</span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-indigo-900">
              <span title="Industry Articles">{stats.byCategory.industry_article} Art</span>
              <span>·</span>
              <span title="Coding Patterns">{stats.byCategory.coding_pattern} Code</span>
              <span>·</span>
              <span title="Behavioral Guides">{stats.byCategory.behavioral_guide} Behave</span>
              <span>·</span>
              <span title="CLI Documentation">{stats.byCategory.cli_docs} CLI</span>
            </div>
            <span className="text-[10px] text-indigo-600">4-Pillar Coverage</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Resources</span>
              <span className="rounded-full bg-slate-700 px-1.5 py-0.2 text-[10px] text-white">
                {resources.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('industry_article')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === 'industry_article'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Industry Articles</span>
              <span className="rounded-full bg-indigo-500 px-1.5 py-0.2 text-[10px] text-white">
                {stats.byCategory.industry_article}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('coding_pattern')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === 'coding_pattern'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Coding Patterns</span>
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] text-white">
                {stats.byCategory.coding_pattern}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('behavioral_guide')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === 'behavioral_guide'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Behavioral Guides</span>
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] text-white">
                {stats.byCategory.behavioral_guide}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('cli_docs')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === 'cli_docs'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>CLI Documentation</span>
              <span className="rounded-full bg-purple-500 px-1.5 py-0.2 text-[10px] text-white font-bold">
                {stats.byCategory.cli_docs}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('bookmarked')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === 'bookmarked'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5 fill-current" />
              <span>Bookmarked</span>
              <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] text-slate-900 font-bold">
                {stats.bookmarkedCount}
              </span>
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search articles, tags, patterns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="to_read">To Read</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Modal / Inline Form: Add Custom Bookmark */}
        {isAddingCustom && (
          <form
            onSubmit={handleAddCustomSubmit}
            className="mt-6 rounded-xl border border-slate-300 bg-slate-50/70 p-5 shadow-xs animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-indigo-600" />
                <span>Bookmark Custom Reference or Industry Article</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">Article / Guide Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Stripe API Idempotency & Concurrency Whitepaper"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ResourceCategory)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="industry_article">Industry Article & Architecture</option>
                  <option value="coding_pattern">Coding Pattern & Algorithm</option>
                  <option value="behavioral_guide">Behavioral Technique Guide</option>
                  <option value="cli_docs">CLI Documentation & Automation Guide</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Source / Publisher Name</label>
                <input
                  type="text"
                  placeholder="e.g., Martin Fowler, Uber Engineering, AWS SRE"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">External URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700">Read Time</label>
                  <input
                    type="text"
                    value={newReadTime}
                    onChange={(e) => setNewReadTime(e.target.value)}
                    placeholder="e.g., 8 min read"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Foundational">Foundational</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Staff / Advanced">Staff / Advanced</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">Summary / Overview</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief synopsis of why this article or pattern is high-yield for this interview..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">Key Takeaways (one per line)</label>
                <textarea
                  rows={2}
                  value={newTakeaways}
                  onChange={(e) => setNewTakeaways(e.target.value)}
                  placeholder="Key point 1&#10;Key point 2&#10;Key point 3"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Distributed Systems, Idempotency, Kafka, STAR"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                Save to Vault
              </button>
            </div>
          </form>
        )}
      </div>

      {/* CLI Documentation & Result Extraction Hub (Displayed when CLI Docs tab is active or all) */}
      {activeCategory === 'cli_docs' && (
        <div className="pt-1">
          <CliDocumentationHub />
        </div>
      )}

      {/* Resource Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong>{filteredResources.length}</strong> of {resources.length} resources
          </span>
          {activeCategory !== 'all' && (
            <button
              onClick={() => setActiveCategory('all')}
              className="text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">No resources found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No articles or guides matched your current search or category filter. Try clearing filters or bookmark a custom link.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Show All Resources
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResources.map((item) => {
              const isCompleted = item.status === 'completed';
              const isReading = item.status === 'reading';

              const categoryBadge = {
                industry_article: {
                  label: 'Industry Article',
                  icon: BookOpen,
                  badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                },
                coding_pattern: {
                  label: 'Coding Pattern',
                  icon: Code2,
                  badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                behavioral_guide: {
                  label: 'Behavioral Guide',
                  icon: Brain,
                  badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
                },
                cli_docs: {
                  label: 'CLI Documentation',
                  icon: Terminal,
                  badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
                },
              }[item.category] || {
                label: 'Resource',
                icon: BookOpen,
                badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
              };

              const Icon = categoryBadge.icon;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : item.isBookmarked
                      ? 'border-amber-200 ring-1 ring-amber-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header Row: Category Badge + Bookmark + Controls */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${categoryBadge.badgeClass}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{categoryBadge.label}</span>
                        </span>

                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                          {item.sourceName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(item.id)}
                          className={`rounded-lg p-1.5 transition ${
                            item.isBookmarked
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                          }`}
                          title={item.isBookmarked ? 'Remove bookmark' : 'Bookmark this guide'}
                        >
                          <Bookmark
                            className={`h-4 w-4 ${item.isBookmarked ? 'fill-amber-500' : ''}`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySummary(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Copy summary & takeaways to clipboard"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(item.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
                            title="Delete custom bookmark"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Link */}
                    <h3 className="mt-2.5 text-base font-bold text-slate-900 group">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-indigo-600 transition"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      </a>
                    </h3>

                    {/* Meta: Read time, difficulty, relevance */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {item.readTime}
                      </span>
                      <span>·</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                        {item.difficulty}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-emerald-600">
                        {item.relevanceScore}% Relevance Match
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Key Takeaways & Cheat-Sheet */}
                    {item.keyTakeaways && item.keyTakeaways.length > 0 && (
                      <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          High-Yield Architectural & Tactical Takeaways
                        </span>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {item.keyTakeaways.map((takeaway, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Matched Requirement Badge */}
                    {item.matchedRequirement && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">Target Alignment:</span>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 font-medium border border-indigo-100">
                          {item.matchedRequirement}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Tags & Status selector */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Status Dropdown */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Status:</span>
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as any)
                          }
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none transition ${
                            isCompleted
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : isReading
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <option value="to_read">To Read</option>
                          <option value="reading">In Progress</option>
                          <option value="completed">Completed ✓</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
