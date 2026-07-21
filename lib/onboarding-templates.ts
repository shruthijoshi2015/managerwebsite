export type OnboardingPhaseTemplate = {
  phase: '30' | '60' | '90';
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  tasks: { title: string; priority: 'P0' | 'P1' | 'P2'; dueDayOffset: number }[];
};

export type RoleOnboardingTemplate = {
  roleName: string;
  phases: OnboardingPhaseTemplate[];
};

export const ONBOARDING_TEMPLATES: RoleOnboardingTemplate[] = [
  {
    roleName: 'Senior Software Engineer',
    phases: [
      {
        phase: '30',
        title: 'Phase 1: Foundation, Setup & First Ship (Days 1–30)',
        description: 'Complete development environment setup, meet stakeholders, and deploy your first bug fix or small feature to production.',
        priority: 'P0',
        tasks: [
          { title: 'Complete local dev environment setup & access provisioning', priority: 'P0', dueDayOffset: 3 },
          { title: 'Schedule 1:1 introductory syncs with engineering buddy and PM', priority: 'P0', dueDayOffset: 5 },
          { title: 'Review core system architecture diagrams and deployment guidelines', priority: 'P1', dueDayOffset: 10 },
          { title: 'Ship first bug fix or minor improvement to production', priority: 'P0', dueDayOffset: 14 },
          { title: 'Complete first code review cycle on peer pull request', priority: 'P1', dueDayOffset: 25 }
        ]
      },
      {
        phase: '60',
        title: 'Phase 2: Autonomy & Technical Ownership (Days 31–60)',
        description: 'Independently lead design and implementation of a medium-sized feature while actively participating in team rituals.',
        priority: 'P0',
        tasks: [
          { title: 'Deliver first end-to-end medium feature within sprint scope', priority: 'P0', dueDayOffset: 45 },
          { title: 'Lead one technical design discussion or sprint refinement sync', priority: 'P1', dueDayOffset: 50 },
          { title: 'Document or refine one internal developer guide / runbook', priority: 'P2', dueDayOffset: 55 }
        ]
      },
      {
        phase: '90',
        title: 'Phase 3: Strategic Impact & Mentorship (Days 61–90)',
        description: 'Own a key roadmap initiative, propose technical optimizations, and fully integrate into senior engineering responsibilities.',
        priority: 'P0',
        tasks: [
          { title: 'Own and execute a major feature roadmap item end-to-end', priority: 'P0', dueDayOffset: 75 },
          { title: 'Propose one system architecture or performance optimization initiative', priority: 'P1', dueDayOffset: 85 },
          { title: 'Participate in engineering interview loop or onboarding buddy check-in', priority: 'P1', dueDayOffset: 90 }
        ]
      }
    ]
  },
  {
    roleName: 'Engineering Manager / Lead',
    phases: [
      {
        phase: '30',
        title: 'Phase 1: Listening, Team Assessment & Trust Building (Days 1–30)',
        description: 'Conduct deep 1:1 check-ins with every direct report, understand current velocity, and establish initial management rhythm.',
        priority: 'P0',
        tasks: [
          { title: 'Complete introductory 1:1s with all direct reports and cross-functional peers', priority: 'P0', dueDayOffset: 7 },
          { title: 'Review team backlog, historical velocity, and current Q3/Q4 objectives', priority: 'P0', dueDayOffset: 14 },
          { title: 'Identify top 2 immediate engineering bottlenecks or developer friction points', priority: 'P1', dueDayOffset: 21 },
          { title: 'Establish recurring weekly or bi-weekly check-in schedule in AntiGravity', priority: 'P0', dueDayOffset: 28 }
        ]
      },
      {
        phase: '60',
        title: 'Phase 2: Operational Rigor & Roadmap Alignment (Days 31–60)',
        description: 'Optimizing team execution workflows, clarifying career tracks, and aligning technical goals with business objectives.',
        priority: 'P0',
        tasks: [
          { title: 'Conduct initial career development & growth aspirations check-in with reports', priority: 'P0', dueDayOffset: 45 },
          { title: 'Implement or streamline one core engineering ritual (sprint planning, post-mortem)', priority: 'P1', dueDayOffset: 50 },
          { title: 'Align team quarterly OKRs/goals with executive product roadmap', priority: 'P0', dueDayOffset: 60 }
        ]
      },
      {
        phase: '90',
        title: 'Phase 3: Long-Term Strategy & Team Scaling (Days 61–90)',
        description: 'Owning capacity planning, performance review readiness, and strategic headcount planning.',
        priority: 'P0',
        tasks: [
          { title: 'Present 6-month technical and hiring capacity roadmap to leadership', priority: 'P0', dueDayOffset: 75 },
          { title: 'Prepare performance review feedback summaries for upcoming review cycle', priority: 'P0', dueDayOffset: 85 }
        ]
      }
    ]
  }
];
