export type RoleGroup = 'aviat' | 'partner' | 'approver';

export interface FaqItem {
  q: string; // i18n key
  a: string; // i18n key
}

export interface GuideSection {
  title: string;
  steps: string[];      // i18n keys
  stepImages: string[]; // one public path per step, '' = no image for that step
}

export const FAQ: Record<RoleGroup, FaqItem[]> = {
  aviat: [
    { q: 'help.faq.aviat.q1', a: 'help.faq.aviat.a1' },
    { q: 'help.faq.aviat.q2', a: 'help.faq.aviat.a2' },
    { q: 'help.faq.aviat.q3', a: 'help.faq.aviat.a3' },
    { q: 'help.faq.aviat.q4', a: 'help.faq.aviat.a4' },
    { q: 'help.faq.aviat.q5', a: 'help.faq.aviat.a5' },
    { q: 'help.faq.aviat.q6', a: 'help.faq.aviat.a6' },
    { q: 'help.faq.aviat.q7', a: 'help.faq.aviat.a7' },
  ],
  partner: [
    { q: 'help.faq.partner.q1', a: 'help.faq.partner.a1' },
    { q: 'help.faq.partner.q2', a: 'help.faq.partner.a2' },
    { q: 'help.faq.partner.q3', a: 'help.faq.partner.a3' },
    { q: 'help.faq.partner.q4', a: 'help.faq.partner.a4' },
    { q: 'help.faq.partner.q5', a: 'help.faq.partner.a5' },
  ],
  approver: [
    { q: 'help.faq.approver.q1', a: 'help.faq.approver.a1' },
    { q: 'help.faq.approver.q2', a: 'help.faq.approver.a2' },
    { q: 'help.faq.approver.q3', a: 'help.faq.approver.a3' },
    { q: 'help.faq.approver.q4', a: 'help.faq.approver.a4' },
    { q: 'help.faq.approver.q5', a: 'help.faq.approver.a5' },
  ],
};

export const GUIDE: Record<RoleGroup, GuideSection[]> = {
  aviat: [
    {
      title: 'help.guide.aviat.s1.title',
      steps: [
        'help.guide.aviat.s1.step1',
        'help.guide.aviat.s1.step2',
        'help.guide.aviat.s1.step3',
        'help.guide.aviat.s1.step4',
      ],
      stepImages: [
        '/images/help/aviat/partners/1.png',
        '/images/help/aviat/partners/2.png',
        '/images/help/aviat/partners/3.png',
        '/images/help/aviat/partners/4.png',
      ],
    },
    {
      title: 'help.guide.aviat.s2.title',
      steps: [
        'help.guide.aviat.s2.step1',
        'help.guide.aviat.s2.step2',
        'help.guide.aviat.s2.step3',
      ],
      stepImages: [
        '/images/help/aviat/template/1.png',
        '/images/help/aviat/template/2.png',
        '/images/help/aviat/template/3.png',
      ],
    },
    {
      title: 'help.guide.aviat.s3.title',
      steps: [
        'help.guide.aviat.s3.step1',
        'help.guide.aviat.s3.step2',
        'help.guide.aviat.s3.step3',
      ],
      stepImages: [
        '/images/help/aviat/users/1.png',
        '/images/help/aviat/users/2.png',
        '/images/help/aviat/users/3.png',
      ],
    },
    {
      title: 'help.guide.aviat.s4.title',
      steps: [
        'help.guide.aviat.s4.step1',
        'help.guide.aviat.s4.step2',
        'help.guide.aviat.s4.step3',
      ],
      stepImages: [
        '/images/help/aviat/export/1.png',
        '/images/help/aviat/export/2.png',
        '/images/help/aviat/export/3.png',
      ],
    },
    {
      title: 'help.guide.aviat.s5.title',
      steps: [
        'help.guide.aviat.s5.step1',
        'help.guide.aviat.s5.step2',
        'help.guide.aviat.s5.step3',
        'help.guide.aviat.s5.step4',
      ],
      stepImages: [
        '/images/help/aviat/submit-new/1.png',
        '/images/help/aviat/submit-new/2.png',
        '/images/help/aviat/submit-new/3.png',
        '/images/help/aviat/submit-new/4.png',
      ],
    },
    {
      title: 'help.guide.aviat.s6.title',
      steps: [
        'help.guide.aviat.s6.step1',
        'help.guide.aviat.s6.step2',
        'help.guide.aviat.s6.step3',
        'help.guide.aviat.s6.step4',
      ],
      stepImages: [
        '/images/help/aviat/submit-ongoing/1.png',
        '/images/help/aviat/submit-ongoing/2.png',
        '/images/help/aviat/submit-ongoing/3.png',
        '/images/help/aviat/submit-ongoing/4.png',
      ],
    },
    {
      title: 'help.guide.aviat.s7.title',
      steps: [
        'help.guide.aviat.s7.step1',
        'help.guide.aviat.s7.step2',
        'help.guide.aviat.s7.step3',
      ],
      stepImages: [
        '/images/help/aviat/reassign/1.png',
        '/images/help/aviat/reassign/2.png',
        '/images/help/aviat/reassign/3.png',
      ],
    },
    {
      title: 'help.guide.aviat.s8.title',
      steps: [
        'help.guide.aviat.s8.step1',
        'help.guide.aviat.s8.step2',
        'help.guide.aviat.s8.step3',
      ],
      stepImages: [
        '/images/help/aviat/reminders/1.png',
        '/images/help/aviat/reminders/2.png',
        '/images/help/aviat/reminders/3.png',
      ],
    },
    {
      title: 'help.guide.aviat.s9.title',
      steps: [
        'help.guide.aviat.s9.step1',
        'help.guide.aviat.s9.step2',
        'help.guide.aviat.s9.step3',
        'help.guide.aviat.s9.step4',
      ],
      stepImages: [
        '/images/help/aviat/l1-approval/1.png',
        '/images/help/aviat/l1-approval/2.png',
        '/images/help/aviat/l1-approval/3.png',
        '/images/help/aviat/l1-approval/4.png',
      ],
    },
  ],
  partner: [
    {
      title: 'help.guide.partner.s1.title',
      steps: [
        'help.guide.partner.s1.step1',
        'help.guide.partner.s1.step2',
        'help.guide.partner.s1.step3',
        'help.guide.partner.s1.step4',
      ],
      stepImages: [
        '/images/help/partner/submit/1.png',
        '/images/help/partner/submit/2.png',
        '/images/help/partner/submit/3.png',
        '/images/help/partner/submit/4.png',
      ],
    },
    {
      title: 'help.guide.partner.s2.title',
      steps: [
        'help.guide.partner.s2.step1',
        'help.guide.partner.s2.step2',
        'help.guide.partner.s2.step3',
      ],
      stepImages: [
        '/images/help/partner/my-documents/1.png',
        '/images/help/partner/my-documents/2.png',
        '/images/help/partner/my-documents/3.png',
      ],
    },
    {
      title: 'help.guide.partner.s3.title',
      steps: [
        'help.guide.partner.s3.step1',
        'help.guide.partner.s3.step2',
        'help.guide.partner.s3.step3',
      ],
      stepImages: [
        '/images/help/partner/revision/1.png',
        '/images/help/partner/revision/2.png',
        '/images/help/partner/revision/3.png',
      ],
    },
  ],
  approver: [
    {
      title: 'help.guide.approver.s1.title',
      steps: [
        'help.guide.approver.s1.step1',
        'help.guide.approver.s1.step2',
        'help.guide.approver.s1.step3',
      ],
      stepImages: [
        '/images/help/approver/need-approval/1.png',
        '/images/help/approver/need-approval/2.png',
        '/images/help/approver/need-approval/3.png',
      ],
    },
    {
      title: 'help.guide.approver.s2.title',
      steps: [
        'help.guide.approver.s2.step1',
        'help.guide.approver.s2.step2',
        'help.guide.approver.s2.step3',
        'help.guide.approver.s2.step4',
      ],
      stepImages: [
        '/images/help/approver/approve/1.png',
        '/images/help/approver/approve/2.png',
        '/images/help/approver/approve/3.png',
        '/images/help/approver/approve/4.png',
      ],
    },
    {
      title: 'help.guide.approver.s3.title',
      steps: [
        'help.guide.approver.s3.step1',
        'help.guide.approver.s3.step2',
      ],
      stepImages: [
        '/images/help/approver/history/1.png',
        '/images/help/approver/history/2.png',
      ],
    },
  ],
};
