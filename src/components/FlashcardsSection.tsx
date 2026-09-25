import React, { useState } from 'react';
import { Play, RotateCw, Check, Edit2, Sparkles, BookOpen } from 'lucide-react';
import { Kit, Flashcard } from '../core/types';

interface FlashcardsSectionProps {
  kit: Kit;
  onLaunchPractice: () => void;
  onUpdateFlashcards: (flashcards: Flashcard[]) => void;
  onRegenerateFlashcards: () => void;
  isRegenerating?: boolean;
}

export const FlashcardsSection: React.FC<FlashcardsSectionProps> = ({
  kit,
  onLaunchPractice,
  onUpdateFlashcards,
  onRegenerateFlashcards,
  isRegenerating,
}) => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (card: Flashcard, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const saveEdit = (card: Flashcard, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = kit.flashcards.map((c) => {
      if (c.id === card.id) {
        return { ...c, front: editFront, back: editBack };
      }
      return c;
    });
    onUpdateFlashcards(updated);
    setEditingCardId(null);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Rapid Active Recall
          </span>
          <h2 className="text-xl font-bold text-slate-900">Revision Flashcards ({kit.flashcards.length})</h2>
          <p className="text-xs text-slate-500">
            Confidence-weighted spaced repetition targeting high-yield interview technical trade-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerateFlashcards}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Deck</span>
          </button>

          <button
            onClick={onLaunchPractice}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-98"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Enter Practice Arena</span>
          </button>
        </div>
      </div>

      {/* Grid of Flashcards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kit.flashcards.map((card) => {
          const isFlipped = flippedCards[card.id] || false;
          const isEditing = editingCardId === card.id;

          return (
            <div
              key={card.id}
              onClick={() => !isEditing && toggleFlip(card.id)}
              className={`group relative flex min-h-[220px] cursor-pointer flex-col justify-between rounded-xl border p-5 transition shadow-xs hover:border-slate-400 ${
                isFlipped ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-2 text-xs opacity-75">
                <span className="font-mono font-bold">{card.id}</span>
                <span className="uppercase text-[10px] tracking-wider">
                  {isFlipped ? 'Back (Answer Outline)' : 'Front (Prompt / Scenario)'}
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <button
                      onClick={(e) => saveEdit(card, e)}
                      className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => startEdit(card, e)}
                      className="rounded p-1 text-slate-400 hover:text-slate-200"
                      title="Edit flashcard"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="my-auto py-3">
                {isEditing ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      rows={2}
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      placeholder="Front text"
                      className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-none"
                    />
                    <textarea
                      rows={3}
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      placeholder="Back text"
                      className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium leading-relaxed">
                    {isFlipped ? card.back : card.front}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t pt-2 text-xs opacity-60">
                <div className="flex items-center gap-1">
                  {card.requirement_ids.map((r) => (
                    <span key={r} className="font-mono text-[10px]">
                      {r}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] flex items-center gap-1">
                  <RotateCw className="h-3 w-3" /> Click to flip
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
