// Listener training modules + quizzes. Quiz pass mark is 100% (spec §3.2).
// Content is deliberately in-code (versioned, reviewable). UI copy rule
// applies here too: "listeners", never counsellors/therapists (Hard Rule 5).

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number; // index into options
};

export type TrainingModule = {
  slug: string;
  title: string;
  body: string[];
  quiz: QuizQuestion[];
};

export const TRAINING_MODULES: TrainingModule[] = [
  {
    slug: "active-listening",
    title: "Active listening",
    body: [
      "Your job is presence, not solutions. Reflect what you hear: 'It sounds like today felt very heavy.'",
      "Ask open questions: 'Would you like to tell me more about that?' Never interrogate.",
      "Silence is okay. Let the member set the pace. Short acknowledgements ('I'm here', 'I'm listening') matter.",
      "Never rush to reassure ('it will be fine!') — it can make people feel unheard.",
    ],
    quiz: [
      {
        q: "A member goes quiet for two minutes. What do you do?",
        options: [
          "Send several messages asking what happened",
          "Wait, then gently let them know you're still here",
          "End the chat — they clearly left",
        ],
        answer: 1,
      },
      {
        q: "The best response to 'my week was terrible' is:",
        options: [
          "'Don't worry, everything happens for a reason.'",
          "'That sounds really hard. Do you want to tell me about it?'",
          "'You should try exercising more.'",
        ],
        answer: 1,
      },
    ],
  },
  {
    slug: "no-advice",
    title: "The no-advice rule",
    body: [
      "You are a listener — NEVER a counsellor, therapist, or advisor. This is a legal requirement (2025 Allied Health Council regulations), not just a guideline.",
      "Never give advice about medication, diagnosis, relationships, money, or religion. Not even 'harmless' advice.",
      "If asked for advice, redirect with warmth: 'I can't advise you, but I'm here to listen while you think it through.'",
      "If a member needs professional help, suggest the helpline 1677 or a doctor — that's a referral, not advice.",
    ],
    quiz: [
      {
        q: "A member asks: 'Should I stop taking my medication?' You say:",
        options: [
          "'Yes, if it makes you feel bad.'",
          "'I can't advise on that — a doctor or 1677 can. I'm here to listen to how it's been for you.'",
          "'What does your family think?'",
        ],
        answer: 1,
      },
      {
        q: "Which word must NEVER describe you on this platform?",
        options: ["Listener", "Volunteer", "Counsellor"],
        answer: 2,
      },
    ],
  },
  {
    slug: "boundaries",
    title: "Boundaries & self-care",
    body: [
      "Keep every conversation on the platform. Never share or request phone numbers, social media, or meetups — soliciting off-platform contact is an instant permanent ban.",
      "You choose when you're available. Respect your daily cap — burned-out listeners can't help anyone.",
      "You will hear heavy things. Use the Listener Lounge to debrief. Asking for support is a strength.",
      "If a chat feels wrong (abusive, sexual, manipulative), end it and report. You never owe anyone your discomfort.",
    ],
    quiz: [
      {
        q: "A member you've helped a lot asks for your Instagram 'just to stay in touch'. You:",
        options: [
          "Share it — you've built trust",
          "Decline kindly and keep the conversation here; sharing contacts is a bannable offence",
          "Give a fake handle",
        ],
        answer: 1,
      },
      {
        q: "After a very heavy chat you should:",
        options: [
          "Take the next chat immediately to stay distracted",
          "Debrief in the Listener Lounge and take a break if you need one",
          "Tell a friend outside the platform all the details",
        ],
        answer: 1,
      },
    ],
  },
  {
    slug: "crisis-protocol",
    title: "Crisis protocol drill",
    body: [
      "If a member talks about suicide or self-harm, stay present. Do not panic, do not disappear, do not promise secrecy.",
      "Tap ESCALATE. The member instantly sees Police 119 and Helpline 1677 with tap-to-call; a duty moderator is alerted. The chat stays open — keep listening.",
      "Say something like: 'I'm really glad you told me. You deserve real support right now — please call 1677 or 119. I'm staying right here with you.'",
      "Urge them to call. The strongest outcome is the member choosing to call themselves.",
      "Afterwards, complete your debrief in the Lounge. A mentor will check in within 24 hours.",
    ],
    quiz: [
      {
        q: "A member writes 'I want to end it all tonight'. Your FIRST action:",
        options: [
          "Keep it secret — they trusted you",
          "Tap Escalate, stay in the chat, and encourage them to call 1677 / 119",
          "End the chat so a professional can take over",
        ],
        answer: 1,
      },
      {
        q: "After you escalate, the chat:",
        options: [
          "Closes automatically",
          "Stays open — you stay present with the member",
          "Is taken over by the moderator",
        ],
        answer: 1,
      },
      {
        q: "Can you promise a member you'll keep their crisis secret?",
        options: [
          "Yes, always",
          "No — never promise secrecy; safety comes first",
          "Only if they're an adult",
        ],
        answer: 1,
      },
    ],
  },
  {
    slug: "anonymity",
    title: "Anonymity rules",
    body: [
      "Members are anonymous. Never ask for their real name, island, workplace, school, or photo.",
      "You are anonymous to members too. Never reveal your identity or personal details.",
      "The Maldives is small. If you suspect you know the member, offer a re-match without pressing for details.",
      "Never discuss a chat with anyone outside the platform — not even 'anonymised' versions with friends.",
    ],
    quiz: [
      {
        q: "You suspect the member is your cousin. You:",
        options: [
          "Ask directly if it's them",
          "Say nothing and offer that they can request a different listener if they'd prefer",
          "Tell them who you are to be honest",
        ],
        answer: 1,
      },
      {
        q: "A member sends what looks like a phone number. You:",
        options: [
          "Save it in case of emergency",
          "Don't use it, remind them the space is anonymous; the system will warn about contact sharing",
          "Call it after the chat",
        ],
        answer: 1,
      },
    ],
  },
];

export function getModule(slug: string): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.slug === slug);
}
