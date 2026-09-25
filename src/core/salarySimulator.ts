/**
 * Salary Negotiation Simulator Engine & Market Compensation Models
 * Provides calibrated market benchmarks, interactive multi-step negotiation scenarios,
 * and battle-tested verbal and email negotiation scripts.
 */

import { Kit } from './types';

export interface MarketCompBand {
  percentile25: number;
  percentile50: number; // Median
  percentile75: number;
  percentile90: number;
}

export interface CompensationBreakdown {
  baseSalary: MarketCompBand;
  equityAnnual: MarketCompBand;
  targetBonusPct: { p25: number; p50: number; p75: number; p90: number };
  signOnBonus: MarketCompBand;
  currency: string;
}

export interface NegotiationScenarioChoice {
  id: string;
  label: string;
  responsePreview: string;
  fullSpeech: string;
  tacticRating: 'optimal' | 'acceptable' | 'suboptimal' | 'hazardous';
  leverageScoreChange: number; // -20 to +25
  financialImpactOutcome: string;
  coachFeedback: string;
  nextStepId?: string;
  recruiterReply: string;
}

export interface NegotiationStep {
  id: string;
  speaker: 'recruiter' | 'hiring_manager' | 'vp_engineering';
  speakerTitle: string;
  speakerPrompt: string;
  contextNote: string;
  choices: NegotiationScenarioChoice[];
  customInputPrompt?: string;
}

export interface NegotiationScenario {
  id: string;
  title: string;
  category: 'Anchoring & Deflection' | 'Counter-Offer Strategy' | 'Competing Offers & Deadlines' | 'Total Rewards & Levers';
  difficulty: 'Foundational' | 'Intermediate' | 'High Stakes';
  description: string;
  initialOfferSummary?: {
    base: number;
    equityAnnual: number;
    signOn: number;
    totalFirstYear: number;
  };
  steps: NegotiationStep[];
}

export interface NegotiationScriptTemplate {
  id: string;
  title: string;
  category: 'verbal' | 'email';
  stage: string;
  summary: string;
  template: string;
  proTips: string[];
}

/**
 * Derive realistic market compensation bands based on role title, location, and company
 */
export function getMarketCompensation(kit: Kit): CompensationBreakdown {
  const title = (kit.role.title || '').toLowerCase();
  const location = (kit.source.location || '').toLowerCase();

  // Tier determination
  const isBayAreaOrNYC =
    location.includes('san francisco') ||
    location.includes('bay area') ||
    location.includes('new york') ||
    location.includes('nyc') ||
    location.includes('seattle');

  const isRemoteUS = location.includes('remote') || location.includes('us') || location.includes('united states');
  const isEurope = location.includes('london') || location.includes('uk') || location.includes('berlin') || location.includes('europe');
  const isIndia = location.includes('india') || location.includes('bangalore') || location.includes('bengaluru');

  let baseMultiplier = 1.0;
  if (isBayAreaOrNYC) baseMultiplier = 1.25;
  else if (isRemoteUS) baseMultiplier = 1.1;
  else if (isEurope) baseMultiplier = 0.85;
  else if (isIndia) baseMultiplier = 0.45;

  // Seniority baseline
  let base25 = 140000;
  let base50 = 165000;
  let base75 = 190000;
  let base90 = 220000;

  let eq25 = 35000;
  let eq50 = 60000;
  let eq75 = 100000;
  let eq90 = 150000;

  let sign25 = 10000;
  let sign50 = 25000;
  let sign75 = 45000;
  let sign90 = 70000;

  if (title.includes('staff') || title.includes('principal') || title.includes('director') || title.includes('lead')) {
    base25 = 210000;
    base50 = 245000;
    base75 = 285000;
    base90 = 330000;

    eq25 = 120000;
    eq50 = 180000;
    eq75 = 260000;
    eq90 = 380000;

    sign25 = 25000;
    sign50 = 50000;
    sign75 = 85000;
    sign90 = 120000;
  } else if (title.includes('senior') || title.includes('sr.')) {
    base25 = 170000;
    base50 = 195000;
    base75 = 230000;
    base90 = 265000;

    eq25 = 60000;
    eq50 = 100000;
    eq75 = 150000;
    eq90 = 210000;

    sign25 = 15000;
    sign50 = 35000;
    sign75 = 60000;
    sign90 = 85000;
  }

  const round1k = (num: number) => Math.round((num * baseMultiplier) / 1000) * 1000;

  return {
    baseSalary: {
      percentile25: round1k(base25),
      percentile50: round1k(base50),
      percentile75: round1k(base75),
      percentile90: round1k(base90),
    },
    equityAnnual: {
      percentile25: round1k(eq25),
      percentile50: round1k(eq50),
      percentile75: round1k(eq75),
      percentile90: round1k(eq90),
    },
    targetBonusPct: {
      p25: 10,
      p50: 15,
      p75: 20,
      p90: 25,
    },
    signOnBonus: {
      percentile25: round1k(sign25),
      percentile50: round1k(sign50),
      percentile75: round1k(sign75),
      percentile90: round1k(sign90),
    },
    currency: isEurope ? 'EUR / GBP' : isIndia ? 'INR' : 'USD',
  };
}

/**
 * Generate interactive negotiation scenarios calibrated to this specific company and role
 */
export function getNegotiationScenarios(kit: Kit): NegotiationScenario[] {
  const company = kit.source.company || 'The Company';
  const role = kit.role.title || 'Software Engineer';
  const market = getMarketCompensation(kit);

  const initialBase = market.baseSalary.percentile25;
  const initialEquity = market.equityAnnual.percentile25;
  const initialSignOn = market.signOnBonus.percentile25;
  const initialTotal = initialBase + initialEquity + initialSignOn;

  return [
    {
      id: 'scen_early_deflection',
      title: 'Deflecting the Early Salary Anchor',
      category: 'Anchoring & Deflection',
      difficulty: 'Foundational',
      description: `During the initial recruiter screen, the talent partner attempts to lock you into a salary number or asks for your current compensation before you have completed interviews.`,
      steps: [
        {
          id: 'step_1',
          speaker: 'recruiter',
          speakerTitle: `Lead Technical Recruiter, ${company}`,
          speakerPrompt: `"Before we set up the technical interviews for ${role}, our finance team requires us to check comp expectations. What salary range are you currently looking for, and what are you making in your current role?"`,
          contextNote: `Golden Rule: Whoever gives a concrete number first surrenders significant bargaining surplus. Never disclose current compensation (in many jurisdictions it is also legally prohibited to ask).`,
          choices: [
            {
              id: 'c1_optimal',
              label: '🎯 Tactical Pivot & Ask for Approved Band (Recommended)',
              responsePreview: `"Right now, I'm focused on finding the right role alignment. Could you share the approved compensation band for this level?"`,
              fullSpeech: `"I appreciate you checking in on that early. Right now, my primary focus is ensuring that there is a mutual technical and architectural fit for the ${role} position. Once we both agree that I'm the strongest candidate to drive impact here at ${company}, I'm confident we can agree on a package that reflects the market. Could you share the budgeted compensation band for this level?"`,
              tacticRating: 'optimal',
              leverageScoreChange: 20,
              financialImpactOutcome: 'Preserves top-of-band leverage without anchoring prematurely.',
              coachFeedback: `Flawless execution! You politely declined to anchor yourself, affirmed high interest in the role, and turned the question around to make the recruiter disclose their approved budget band first.`,
              recruiterReply: `"That's completely fair! For this level, our standard base salary band is $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k - $${(market.baseSalary.percentile75 / 1000).toFixed(0)}k, with annual equity grants and target bonus on top depending on interview calibration."`,
            },
            {
              id: 'c1_suboptimal',
              label: '⚠️ Premature Self-Anchoring to Median',
              responsePreview: `"I'm hoping to make around $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k base plus standard equity."`,
              fullSpeech: `"Well, based on my research on Glassdoor and Levels.fyi, I think around $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k base salary would be fair for this level, plus whatever equity is standard."`,
              tacticRating: 'suboptimal',
              leverageScoreChange: -10,
              financialImpactOutcome: 'Caps your upside at the median; recruiter notes this as your ceiling.',
              coachFeedback: `By blurting out $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k, you gave away your ceiling before demonstrating interview excellence. The company now has zero financial incentive to offer you top-of-band.`,
              recruiterReply: `"Great, $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k is well within our budget range. Let's proceed with scheduling the technical loops!"`,
            },
            {
              id: 'c1_hazardous',
              label: '❌ Disclosing Current Compensation Directly',
              responsePreview: `"I currently make $${((market.baseSalary.percentile25 * 0.85) / 1000).toFixed(0)}k at my current company, so anything higher is great."`,
              fullSpeech: `"My current salary is $${((market.baseSalary.percentile25 * 0.85) / 1000).toFixed(0)}k. I'm really looking for at least a 10% to 15% bump to justify moving."`,
              tacticRating: 'hazardous',
              leverageScoreChange: -25,
              financialImpactOutcome: 'Anchor traps you at +10% over current instead of fair market rate.',
              coachFeedback: `Danger zone: Tying your new offer to your past pay guarantees that you leave $40k-$80k of market equity on the table. Value is determined by your impact at ${company}, not your past paycheck.`,
              recruiterReply: `"Noted! We can definitely beat that current number. I'll make sure our proposal reflects a nice step up for you."`,
            },
          ],
        },
      ],
    },
    {
      id: 'scen_counter_offer',
      title: 'Countering the Initial Lowball Offer',
      category: 'Counter-Offer Strategy',
      difficulty: 'Intermediate',
      description: `${company} made an initial formal offer, but it lands at the 25th percentile of the market band. You need to present a multi-variable counter-offer without appearing greedy or adversarial.`,
      initialOfferSummary: {
        base: initialBase,
        equityAnnual: initialEquity,
        signOn: initialSignOn,
        totalFirstYear: initialTotal,
      },
      steps: [
        {
          id: 'step_counter_1',
          speaker: 'recruiter',
          speakerTitle: `Head of Talent Acquisition, ${company}`,
          speakerPrompt: `"We have fantastic news! The engineering feedback was overwhelmingly positive. We're excited to extend an offer for ${role}: Base Salary of $${(initialBase / 1000).toFixed(0)}k, $${(initialEquity / 1000).toFixed(0)}k in annual equity grants, and a $${(initialSignOn / 1000).toFixed(0)}k signing bonus. Total first-year compensation is $${(initialTotal / 1000).toFixed(0)}k. How does that sound to you?"`,
          contextNote: `Rule: Never accept on the call. Express enthusiasm, request the full offer sheet in writing, and schedule a dedicated counter-offer conversation after analyzing the market delta.`,
          choices: [
            {
              id: 'c2_optimal',
              label: '🎯 Enthusiastic Gratitude + Calibrated 3-Point Counter',
              responsePreview: `"Thank you so much! I'm thrilled about the team. Based on market data and the technical ownership required, I'd like to propose $${(market.baseSalary.percentile75 / 1000).toFixed(0)}k base and $${(market.equityAnnual.percentile75 / 1000).toFixed(0)}k equity."`,
              fullSpeech: `"Thank you so much for putting this together! I really enjoyed meeting the engineering team, and I'm deeply enthusiastic about the roadmap we discussed. After carefully reviewing the scope of the ${role} role and cross-referencing industry market data for senior technical ownership at ${company}'s scale, I'd like to propose an adjustment to bring this closer to the 75th percentile: a Base Salary of $${(market.baseSalary.percentile75 / 1000).toFixed(0)}k, an annual equity grant of $${(market.equityAnnual.percentile75 / 1000).toFixed(0)}k, and a sign-on bonus of $${(market.signOnBonus.percentile50 / 1000).toFixed(0)}k. If we can reach these numbers, I am ready to sign immediately and decline my other discussions."`,
              tacticRating: 'optimal',
              leverageScoreChange: 25,
              financialImpactOutcome: `Potential +$${((market.baseSalary.percentile75 - initialBase + (market.equityAnnual.percentile75 - initialEquity)) / 1000).toFixed(0)}k annual compensation uplift!`,
              coachFeedback: `Masterful! You paired strong excitement with a clear "closing commitment" ("If we can reach these numbers, I am ready to sign immediately"). Recruiters love closing commitments because it gives them political capital with the compensation committee.`,
              recruiterReply: `"I really appreciate how clearly you laid this out. I can't guarantee we can hit every single number, but knowing you're ready to sign today gives me strong ammunition to advocate for you with the VP of Engineering and the comp committee. Let me see what we can do!"`,
            },
            {
              id: 'c2_suboptimal',
              label: '⚠️ Vague "Can You Do Better?" Without Numbers',
              responsePreview: `"This feels a bit low. Is there any flexibility to increase the compensation?"`,
              fullSpeech: `"Thank you for the offer. Honestly, it feels a bit lower than what I was hoping for. Is there any flexibility to increase the package?"`,
              tacticRating: 'suboptimal',
              leverageScoreChange: 5,
              financialImpactOutcome: 'Yields a token $5k-$10k bump instead of a substantial bracket reset.',
              coachFeedback: `A vague "can you do better?" forces the recruiter to guess what you want. They will almost always offer the absolute minimum token bump (e.g., +$5,000) to test if you will cave. Always provide concrete, justified numbers.`,
              recruiterReply: `"We put forward a very competitive offer, but I might be able to bump the signing bonus by $5,000. Would that be enough for you to accept?"`,
            },
            {
              id: 'c2_hazardous',
              label: '❌ Aggressive Ultimatums ("This is insulting")',
              responsePreview: `"This is insulting for someone with my experience. I won't accept anything under $${(market.baseSalary.percentile90 / 1000).toFixed(0)}k."`,
              fullSpeech: `"To be blunt, this offer is frankly insulting given my years of experience and how well my interviews went. I won't even consider anything below $${(market.baseSalary.percentile90 / 1000).toFixed(0)}k."`,
              tacticRating: 'hazardous',
              leverageScoreChange: -25,
              financialImpactOutcome: 'High risk of offer rescission or toxic team reputation.',
              coachFeedback: `Fatal mistake: An adversarial tone attacks the recruiter's competence and burns social capital before Day 1. Negotiation is a collaborative problem-solving exercise, never an aggressive confrontation.`,
              recruiterReply: `"I'm sorry you feel that way. We calibrate our bands very rigorously based on market data. If that range doesn't work for you, we understand and wish you the best in your search."`,
            },
          ],
        },
      ],
    },
    {
      id: 'scen_competing_deadlines',
      title: 'Leveraging Competing Offers & 48h Exploding Deadlines',
      category: 'Competing Offers & Deadlines',
      difficulty: 'High Stakes',
      description: `${company} sends an offer but slaps an aggressive 48-hour deadline on it while you are in final rounds with another strong firm.`,
      steps: [
        {
          id: 'step_deadline_1',
          speaker: 'recruiter',
          speakerTitle: `Talent Partner, ${company}`,
          speakerPrompt: `"We have multiple candidates waiting in the wings for this ${role} position. We need a signed acceptance letter within 48 hours, or the hiring manager will be forced to release the headcount to the next candidate."`,
          contextNote: `Exploding deadlines are almost always artificial negotiation pressure designed to prevent you from collecting competing bids. Companies spend $30k+ interviewing you; they will rarely walk away over a reasonable 5-7 day extension.`,
          choices: [
            {
              id: 'c3_optimal',
              label: '🎯 Professional Deadline Extension + Active Pipeline Transparency',
              responsePreview: `"I want to make an intentional, long-term commitment. I have final rounds concluding next Tuesday; can we set a decision date for next Thursday?"`,
              fullSpeech: `"I completely understand the team's desire to move swiftly to fill this critical role. Because joining ${company} is a significant career decision, I want to make sure I am entering with complete, 100% commitment. Out of respect for other processes I committed to, I have final conversations wrapping up early next week. Can we establish next Thursday at 5 PM as our definitive decision date? That allows me to give this the dedicated consideration it deserves."`,
              tacticRating: 'optimal',
              leverageScoreChange: 20,
              financialImpactOutcome: 'Diffuses deadline pressure and signals high market demand without hostility.',
              coachFeedback: `Brilliant! You framed the extension not as hesitation, but as professional integrity and high commitment. Mentioning active final rounds signals scarcity and drives urgency back onto the company.`,
              recruiterReply: `"Thank you for being upfront. We certainly want you to feel 100% excited and confident joining us. Let's agree on next Wednesday at noon as our target date. In the meantime, let me know if any other numbers come in that we need to compete against!"`,
            },
            {
              id: 'c3_suboptimal',
              label: '⚠️ Caving to the Artificial Deadline',
              responsePreview: `"Okay, 48 hours is really tight, but I'll try my best to sign by tomorrow."`,
              fullSpeech: `"That's really fast, and I'm stressed, but I guess if that's the rule I don't want to lose the offer. I'll sign it before Friday."`,
              tacticRating: 'suboptimal',
              leverageScoreChange: -15,
              financialImpactOutcome: 'Surrenders all leverage and aborts other potentially higher offers.',
              coachFeedback: `You folded under pressure! Now you'll never know if the second company would have offered 30% more. Never let artificial 48-hour deadlines panic you into a premature sign.`,
              recruiterReply: `"Excellent! We look forward to getting your signed paperwork by tomorrow evening."`,
            },
          ],
        },
      ],
    },
    {
      id: 'scen_non_salary_levers',
      title: 'Base Salary Capped: Unlocking Alternative Levers',
      category: 'Total Rewards & Levers',
      difficulty: 'Intermediate',
      description: `The recruiter states: "Our base salary band for this level is strictly capped by HR at $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k." You need to negotiate other high-value compensation levers.`,
      steps: [
        {
          id: 'step_levers_1',
          speaker: 'hiring_manager',
          speakerTitle: `VP of Engineering, ${company}`,
          speakerPrompt: `"I'd love to give you more base, but our HR department has hard salary ceilings for internal equity. $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k is literally the highest base allowed for this title grade."`,
          contextNote: `When Base Salary is genuinely capped, Total Compensation (TC) can still be dramatically increased via: Signing Bonus, Additional RSUs / Front-Loaded Vesting, Accelerated 6-Month Comp Review, Remote Stipends, or Higher Title Leveling.`,
          choices: [
            {
              id: 'c4_optimal',
              label: '🎯 Pivot to Signing Bonus & Front-Loaded Equity Grant',
              responsePreview: `"I respect the base salary band constraints. Can we bridge the gap with an additional $35k in RSUs and a $25k sign-on bonus?"`,
              fullSpeech: `"I completely understand and respect internal equity constraints regarding base salary bands. Since the base is fixed at $${(market.baseSalary.percentile50 / 1000).toFixed(0)}k, let's look at bridging the $30k gap through non-base levers. Would the team be open to increasing the initial equity grant by $35,000 and adding a $25,000 signing bonus to make the first-year package whole? Additionally, I'd love to formalize a performance and compensation review milestone at 6 months rather than a year."`,
              tacticRating: 'optimal',
              leverageScoreChange: 25,
              financialImpactOutcome: `Successfully captured +$60k in total rewards without violating base salary caps.`,
              coachFeedback: `Textbook negotiation! You didn't argue against their hard constraints; you adapted and tapped the two buckets with the highest departmental discretion: equity and sign-on bonuses.`,
              recruiterReply: `"That's a very pragmatic proposal. Finance actually gives us far more flexibility on one-time signing bonuses and stock option pools than on permanent base payroll. Let me run this exact adjustment by the team!"`,
            },
            {
              id: 'c4_suboptimal',
              label: '⚠️ Continuing to Push on the Hard Base Cap',
              responsePreview: `"Are you sure you can't make an exception on the base salary? Just $15k more?"`,
              fullSpeech: `"Are you sure there is no exception to the base rule? I really feel like my experience justifies making an exception to pay me more base."`,
              tacticRating: 'suboptimal',
              leverageScoreChange: -10,
              financialImpactOutcome: 'Stalls the conversation and creates friction over an immovable policy.',
              coachFeedback: `When HR or leadership has a strict policy ceiling on base payroll, continuing to push makes you appear tone-deaf to company operations. Pivot to equity, sign-on, and milestone reviews instead.`,
              recruiterReply: `"As I mentioned, our base bands are audited by legal for internal parity. If base is your only sticking point, we won't be able to move further."`,
            },
          ],
        },
      ],
    },
  ];
}

/**
 * Battle-tested verbal and email script templates
 */
export function getNegotiationScriptTemplates(kit: Kit): NegotiationScriptTemplate[] {
  const company = kit.source.company || '[Company Name]';
  const role = kit.role.title || '[Role Title]';
  const market = getMarketCompensation(kit);

  return [
    {
      id: 'script_verbal_counter',
      title: 'The Calibrated Verbal Counter-Offer Script',
      category: 'verbal',
      stage: 'During Offer Phone Conversation',
      summary: 'Used when the recruiter presents the initial numbers live on a call to avoid premature acceptance and establish market baseline.',
      template: `\"Thank you so much, [Recruiter Name]! I am genuinely thrilled about this offer and the opportunity to work with the team on [key project/product area]. 

I want to be completely transparent: ${company} is my top choice. After reviewing the scope of the ${role} position and cross-referencing recent market data for this tier of technical ownership, I noticed the total package is slightly below the 75th percentile.

If we can bring the Base Salary to $[Target Base] and the annual equity grant to $[Target Equity], I would be delighted to accept and sign today. How much flexibility do we have to explore that with the compensation committee?\"`,
      proTips: [
        'Always start with genuine warmth and enthusiasm for the team and mission.',
        'Use "we" rather than "you" to frame negotiation as collaborative teamwork ("How can we explore that together?").',
        'State a closing condition: "If we can reach X, I will sign immediately."',
      ],
    },
    {
      id: 'script_email_counter',
      title: 'The Comprehensive Written Counter-Offer Email',
      category: 'email',
      stage: 'Formal Written Negotiation',
      summary: 'Professional multi-point email clearly breaking down base, equity, and sign-on with data-backed justification.',
      template: `Subject: ${role} Offer – [Your Name] – Next Steps & Compensation

Hi [Recruiter Name],

Thank you again for extending the offer to join ${company} as a ${role}. I really enjoyed getting to know the engineering team throughout the interview process, and I'm very energized by the technical challenges ahead.

I've taken time to review the details of the offer sheet. Given the scope of responsibilities, my track record in [mention 1 key technical strength, e.g. distributed systems / cloud infrastructure], and current market benchmarks for senior talent in our space, I would like to propose the following adjustments to finalize our agreement:

• Base Salary: $[Target Base, e.g., ${(market.baseSalary.percentile75 / 1000).toFixed(0)},000] (currently $[Offered Base])
• Annual Equity Grant: $[Target Equity, e.g., ${(market.equityAnnual.percentile75 / 1000).toFixed(0)},000] (currently $[Offered Equity])
• Signing Bonus: $[Target Sign-on, e.g., ${(market.signOnBonus.percentile50 / 1000).toFixed(0)},000] (to bridge first-year transition)

With these adjustments, I would be thrilled to sign the offer immediately, decline my other active discussions, and begin onboarding.

Could you let me know if we can discuss this with the hiring team? I'm available for a brief call at your convenience.

Warm regards,
[Your Name]
[Your Phone Number]`,
      proTips: [
        'Keep the tone collaborative, concise, and structured with bullet points.',
        'Always link requested increases back to your unique qualifications and market data.',
        'Reiterate that you are ready to sign immediately upon approval.',
      ],
    },
    {
      id: 'script_competing_leverage',
      title: 'Leveraging a Competing Offer Respectfully',
      category: 'email',
      stage: 'Multiple Active Offers',
      summary: 'How to notify a recruiter that another company has offered higher compensation without sounding like you are auctioning yourself off.',
      template: `Subject: Update regarding ${role} Offer – [Your Name]

Hi [Recruiter Name],

I wanted to provide a quick and transparent update on my search. ${company} remains my clear first choice because of the culture and the team's mission.

At the same time, I have received another formal offer for a similar role with a first-year total compensation of $[Competitor Total, e.g., ${((market.baseSalary.percentile75 + market.equityAnnual.percentile75) / 1000).toFixed(0)},000] ($[Competitor Base] base + $[Competitor Equity] equity).

Because ${company} is where I truly want to build long-term, I would love to see if we can close the gap. If ${company} is able to match or come close to $[Target Number], I will happily sign right away and withdraw from the other process.

Thank you again for your partnership throughout this process.

Best,
[Your Name]`,
      proTips: [
        'State clearly that their company is your primary preference; this gives them motivation to fight for you.',
        'Give concrete numbers rather than vague hints so the recruiter has clear figures to request from finance.',
        'Never fabricate competing offers. Always be honest, as recruiters in the same industry frequently cross-check market patterns.',
      ],
    },
    {
      id: 'script_exploding_deadline',
      title: 'Defusing an Exploding 48-Hour Deadline',
      category: 'email',
      stage: 'Deadline Extension Request',
      summary: 'Firm and courteous email requesting an additional 5-7 business days to conclude final due diligence.',
      template: `Subject: ${role} Offer Consideration Timeline – [Your Name]

Hi [Recruiter Name],

Thank you for sending over the formal offer letter! I am very excited about the prospect of joining the team.

Regarding the [Current Deadline, e.g. 48-hour] acceptance window: joining ${company} is a pivotal career milestone, and I want to ensure I am making a fully committed, thoughtful decision. Additionally, out of professional integrity, I have a final round of conversations already scheduled with another team through early next week.

Would it be possible to extend the decision deadline to [Target Date, e.g., next Thursday at 5 PM]? 

This will give me the necessary time to finalize my review, discuss with my family, and ensure I step into Day 1 at ${company} with undivided energy.

Thank you so much for your understanding and flexibility!

Warmly,
[Your Name]`,
      proTips: [
        'Frame the extension request as a sign of your thoroughness and commitment.',
        'Propose a specific date and time rather than an open-ended request.',
        'Express gratitude and maintain high enthusiasm throughout.',
      ],
    },
  ];
}
