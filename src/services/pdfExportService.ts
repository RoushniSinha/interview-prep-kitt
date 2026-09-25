import { jsPDF } from 'jspdf';
import { Kit, StoredKit, Question, Requirement, Flashcard, ScheduleDay } from '../core/types';

export interface PdfExportOptions {
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateLocation?: string;
  includeResumeSection?: boolean;
  includeCompanyBrief?: boolean;
  includeRequirements?: boolean;
  includeQuestions?: boolean;
  includeSchedule?: boolean;
  includeFlashcards?: boolean;
}

/**
 * Generates an executive, publication-grade PDF document containing
 * a tailored candidate resume and comprehensive interview preparation summary.
 */
export function generateKitPdf(
  kit: Kit,
  storedKit?: StoredKit | null,
  options: PdfExportOptions = {}
): jsPDF {
  const {
    candidateName = 'Candidate Profile',
    candidateEmail = 'candidate@interviewkit.io',
    candidatePhone = '',
    candidateLocation = kit.source.location || 'Remote',
    includeResumeSection = true,
    includeCompanyBrief = true,
    includeRequirements = true,
    includeQuestions = true,
    includeSchedule = true,
    includeFlashcards = true,
  } = options;

  // Initialize jsPDF with standard A4 dimensions (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Color Palette
  const COLOR_PRIMARY = [15, 23, 42]; // Slate 900
  const COLOR_SECONDARY = [51, 65, 85]; // Slate 700
  const COLOR_MUTED = [100, 116, 139]; // Slate 500
  const COLOR_ACCENT = [79, 70, 229]; // Indigo 600
  const COLOR_BORDER = [226, 232, 240]; // Slate 200
  const COLOR_LIGHT_BG = [248, 250, 252]; // Slate 50

  // Helper: check page break
  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      cursorY = margin + 10;
      renderRunningHeader();
    }
  };

  // Helper: render running header on subsequent pages
  const renderRunningHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(
      `${kit.role.title} · ${kit.source.company} | Interview Preparation Kit & Executive Summary`,
      margin,
      margin - 2
    );
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, margin + 1, pageWidth - margin, margin + 1);
  };

  // Helper: render section title
  const renderSectionHeader = (title: string, subtitle?: string) => {
    checkPageBreak(18);
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(title.toUpperCase(), margin, cursorY);
    cursorY += 2;

    // Underline bar
    doc.setDrawColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, cursorY, margin + 35, cursorY);

    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin + 35, cursorY, pageWidth - margin, cursorY);

    cursorY += 4;

    if (subtitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(subtitle, margin, cursorY);
      cursorY += 4;
    }
  };

  // ==========================================================================
  // Document Top Header / Banner
  // ==========================================================================
  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(candidateName, margin, cursorY);
  cursorY += 5;

  // Candidate Subtitle / Contact line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  const contactParts = [
    candidateEmail,
    candidatePhone,
    candidateLocation,
    `Target: ${kit.role.title} at ${kit.source.company}`,
  ].filter(Boolean);
  doc.text(contactParts.join('  ·  '), margin, cursorY);
  cursorY += 6;

  // Thin separator
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // ==========================================================================
  // 1. Executive Resume & Role Fit Alignment
  // ==========================================================================
  if (includeResumeSection) {
    renderSectionHeader(
      'Targeted Executive Profile & Career Summary',
      `Calibrated specifically for ${kit.role.seniority} ${kit.role.title} engagement`
    );

    // Profile Summary Paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    const summaryText = `Experienced ${kit.role.seniority} engineering professional with proven expertise aligned directly with ${kit.source.company}'s mission. Demonstrates specialized command over distributed systems, robust software architecture, and cross-functional execution. Combines technical rigor with proactive operational discipline.`;
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(splitSummary, margin, cursorY);
    cursorY += splitSummary.length * 4.5 + 4;

    // Core Competencies Matrix Box
    checkPageBreak(25);
    doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(margin, cursorY, contentWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.text('CORE TARGET COMPETENCIES & KEY STRENGTHS', margin + 4, cursorY + 5);

    // Collect technical, behavioural, and domain requirements
    const techSkills = kit.role.requirements
      .filter((r) => r.kind === 'technical')
      .map((r) => r.text)
      .slice(0, 3)
      .join(', ');
    const domainSkills = kit.role.requirements
      .filter((r) => r.kind === 'domain')
      .map((r) => r.text)
      .slice(0, 2)
      .join(', ');
    const softSkills = kit.role.requirements
      .filter((r) => r.kind === 'behavioural')
      .map((r) => r.text)
      .slice(0, 2)
      .join(', ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(
      `• Technical Mastery: ${techSkills || 'System Architecture, Scalable Engineering, Performance Optimization'}`,
      margin + 4,
      cursorY + 10
    );
    doc.text(
      `• Domain Alignment: ${domainSkills || kit.company_brief.what_they_do.slice(0, 70)}`,
      margin + 4,
      cursorY + 14.5
    );
    doc.text(
      `• Leadership & Execution: ${softSkills || 'Technical Mentorship, Cross-Functional Delivery, Root-Cause Incident Triage'}`,
      margin + 4,
      cursorY + 19
    );
    cursorY += 28;

    // Key Targeted Responsibilities
    if (kit.role.responsibilities && kit.role.responsibilities.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.text('KEY TARGET RESPONSIBILITIES:', margin, cursorY);
      cursorY += 4.5;

      kit.role.responsibilities.forEach((resp) => {
        checkPageBreak(10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        const respText = `•  ${resp}`;
        const lines = doc.splitTextToSize(respText, contentWidth - 4);
        doc.text(lines, margin + 2, cursorY);
        cursorY += lines.length * 4 + 1.5;
      });
      cursorY += 3;
    }
  }

  // ==========================================================================
  // 2. Company Intelligence & Grounded Brief
  // ==========================================================================
  if (includeCompanyBrief) {
    renderSectionHeader(
      'Company Intelligence & Grounded Research',
      `Strategic briefing synthesized for ${kit.source.company}`
    );

    checkPageBreak(30);

    // Summary Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text('Overview & Market Positioning:', margin, cursorY);
    cursorY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    const summaryLines = doc.splitTextToSize(kit.company_brief.summary, contentWidth);
    doc.text(summaryLines, margin, cursorY);
    cursorY += summaryLines.length * 4 + 3;

    // What they do
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text('Product & Technical Ecosystem:', margin, cursorY);
    cursorY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
    const whatTheyDoLines = doc.splitTextToSize(kit.company_brief.what_they_do, contentWidth);
    doc.text(whatTheyDoLines, margin, cursorY);
    cursorY += whatTheyDoLines.length * 4 + 3;

    // Sources
    if (kit.company_brief.sources && kit.company_brief.sources.length > 0) {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text('Grounding Verification Sources:', margin, cursorY);
      cursorY += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      kit.company_brief.sources.slice(0, 3).forEach((src) => {
        doc.text(`- ${src}`, margin + 2, cursorY);
        cursorY += 3.5;
      });
      cursorY += 3;
    }
  }

  // ==========================================================================
  // 3. Requirements & Prioritization Matrix
  // ==========================================================================
  if (includeRequirements && kit.role.requirements.length > 0) {
    renderSectionHeader(
      'Requirements & Evaluation Criteria',
      'Defensive mapping of Must-Have core criteria and Nice-to-Have advantages'
    );

    const mustReqs = kit.role.requirements.filter((r) => r.priority === 'must');
    const niceReqs = kit.role.requirements.filter((r) => r.priority === 'nice');

    // Must-have requirements
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red 700
    doc.text(`MUST-HAVE MANDATORY QUALIFICATIONS (${mustReqs.length})`, margin, cursorY);
    cursorY += 4.5;

    mustReqs.forEach((r) => {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.text(`[${r.id.toUpperCase()}]`, margin + 2, cursorY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      const reqLines = doc.splitTextToSize(`${r.text}  (${r.kind})`, contentWidth - 16);
      doc.text(reqLines, margin + 14, cursorY);
      cursorY += reqLines.length * 4 + 1.5;
    });

    cursorY += 3;

    // Nice-to-have requirements
    if (niceReqs.length > 0) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(`NICE-TO-HAVE ADVANTAGE QUALIFICATIONS (${niceReqs.length})`, margin, cursorY);
      cursorY += 4.5;

      niceReqs.forEach((r) => {
        checkPageBreak(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        doc.text(`[${r.id.toUpperCase()}]`, margin + 2, cursorY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        const reqLines = doc.splitTextToSize(`${r.text}  (${r.kind})`, contentWidth - 16);
        doc.text(reqLines, margin + 14, cursorY);
        cursorY += reqLines.length * 4 + 1.5;
      });
      cursorY += 4;
    }
  }

  // ==========================================================================
  // 4. Deterministic Preparation Study Schedule
  // ==========================================================================
  if (includeSchedule && kit.schedule.days.length > 0) {
    renderSectionHeader(
      'Deterministic Preparation Study Schedule',
      `${kit.schedule.days_available}-Day front-loaded plan with strict integer minutes`
    );

    checkPageBreak(20);

    // Schedule Table Header
    doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.rect(margin, cursorY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DAY', margin + 3, cursorY + 4.8);
    doc.text('STRATEGIC FOCUS', margin + 20, cursorY + 4.8);
    doc.text('ALLOCATION', margin + 120, cursorY + 4.8);
    doc.text('QUESTIONS', margin + 155, cursorY + 4.8);
    cursorY += 8;

    kit.schedule.days.forEach((day, idx) => {
      checkPageBreak(8);

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
        doc.rect(margin, cursorY - 1, contentWidth, 7, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.text(`Day ${day.day}`, margin + 3, cursorY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.text(day.focus.slice(0, 55), margin + 20, cursorY + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
      doc.text(`${day.minutes} mins`, margin + 120, cursorY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(
        day.question_ids.length > 0 ? `${day.question_ids.length} items (${day.question_ids.join(', ')})` : 'Self-review',
        margin + 155,
        cursorY + 3.8
      );

      cursorY += 7.5;
    });

    cursorY += 4;
  }

  // ==========================================================================
  // 5. Curated High-Yield Interview Question Bank
  // ==========================================================================
  if (includeQuestions && kit.questions.length > 0) {
    renderSectionHeader(
      'Curated High-Yield Interview Question Bank',
      `${kit.questions.length} questions calibrated for role requirements and difficulty tiers`
    );

    kit.questions.forEach((q, idx) => {
      checkPageBreak(32);

      // Question container card
      doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);

      // Measure height needed for prompt and outline
      const promptLines = doc.splitTextToSize(`Q${idx + 1}: ${q.prompt}`, contentWidth - 8);
      const outlineLines = doc.splitTextToSize(`Outline: ${q.answer_outline}`, contentWidth - 8);
      const cardHeight = promptLines.length * 4 + outlineLines.length * 3.8 + 14;

      checkPageBreak(cardHeight + 4);

      doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 1.5, 1.5, 'FD');

      // Category and Difficulty Indicator
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
      const catText = q.category.toUpperCase().replace('-', ' ');
      const diffStars = q.difficulty === 3 ? '★★★ Level 3 (Advanced)' : q.difficulty === 2 ? '★★☆ Level 2 (Intermediate)' : '★☆☆ Level 1 (Foundational)';
      const targetReqs = q.requirement_ids?.join(', ') || '';
      doc.text(
        `${catText}  ·  ${diffStars}  ·  Target: [${targetReqs}]`,
        margin + 4,
        cursorY + 5
      );

      // Question Prompt
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.text(promptLines, margin + 4, cursorY + 10);

      // Answer Outline
      const outlineStartY = cursorY + 10 + promptLines.length * 4 + 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.text(outlineLines, margin + 4, outlineStartY);

      cursorY += cardHeight + 4;
    });
  }

  // ==========================================================================
  // 6. Flashcard Mastery Concepts
  // ==========================================================================
  if (includeFlashcards && kit.flashcards.length > 0) {
    renderSectionHeader(
      'Active Recall Flashcard Concepts',
      `${kit.flashcards.length} targeted concepts for spaced repetition and interview drill-down`
    );

    kit.flashcards.slice(0, 10).forEach((fc, idx) => {
      checkPageBreak(20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      const frontLines = doc.splitTextToSize(`${idx + 1}. Concept: ${fc.front}`, contentWidth - 4);
      doc.text(frontLines, margin + 2, cursorY);
      cursorY += frontLines.length * 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      const backLines = doc.splitTextToSize(`   Key Takeaway: ${fc.back}`, contentWidth - 8);
      doc.text(backLines, margin + 4, cursorY);
      cursorY += backLines.length * 3.8 + 2.5;
    });
  }

  // ==========================================================================
  // Page Numbers & Footer on All Pages
  // ==========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);

    // Footer divider line
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Left: Generated timestamp & platform
    doc.text(
      `Generated by AegisOps Interview Prep Kit  ·  ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - 7
    );

    // Right: Page X of Y
    const pageStr = `Page ${i} of ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - margin - pageStrWidth, pageHeight - 7);
  }

  return doc;
}

/**
 * Convenience helper to download the kit PDF immediately in browser
 */
export function downloadKitPdf(
  kit: Kit,
  storedKit?: StoredKit | null,
  options: PdfExportOptions = {}
): void {
  const doc = generateKitPdf(kit, storedKit, options);
  const companySlug = (kit.source.company || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
  const roleSlug = (kit.role.title || 'Role').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${companySlug}_${roleSlug}_Interview_Prep_Resume_Summary.pdf`;
  doc.save(fileName);
}
