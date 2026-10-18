import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { LearningSession, TimelineMilestone, SessionVisual, ChatMessage } from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'learning-sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed sessions so parents immediately see an inspiring timeline & AI memory
const INITIAL_SEED_SESSIONS: LearningSession[] = [
  {
    id: 'seed-session-1',
    startedAt: Date.now() - 86400000 * 2, // 2 days ago
    endedAt: Date.now() - 86400000 * 2 + 1000 * 60 * 14,
    durationSeconds: 840,
    targetClass: 'Class 2',
    title: 'Parts of a Plant & Why Leaves Are Green',
    summary:
      'The child learned the 4 basic parts of a plant (roots, stem, leaves, flower) with a visual diagram, and discovered how chlorophyll acts like a little green kitchen that absorbs sunlight.',
    keyLearnings: [
      'Roots absorb water and nutrients from the soil like tiny sponges.',
      'The stem acts like an elevator that carries water up to the leaves.',
      'Leaves make food for the plant using sunlight and chlorophyll.',
      'Flowers help the plant make seeds to grow new plants.',
    ],
    skillsCovered: ['Botanical Science', 'Diagram Reading', 'Scientific Vocabulary'],
    timeline: [
      {
        id: 'm1',
        timestamp: Date.now() - 86400000 * 2 + 1000 * 60 * 2,
        type: 'concept',
        title: 'Explored Root & Stem Functions',
        description: 'Understood how roots anchor the plant and drink water from the soil.',
      },
      {
        id: 'm2',
        timestamp: Date.now() - 86400000 * 2 + 1000 * 60 * 5,
        type: 'visual',
        title: 'Examined Labelled Plant Diagram',
        description: 'Visual diagram created showing flower, leaf, stem, and roots.',
      },
      {
        id: 'm3',
        timestamp: Date.now() - 86400000 * 2 + 1000 * 60 * 9,
        type: 'question',
        title: 'Curious Question: "Why are leaves green?"',
        description: 'Child wondered why leaves are green instead of blue or red.',
        childQuestion: 'Why are leaves green and not blue?',
        teacherHighlight: 'Explained chlorophyll as nature’s green solar panel.',
      },
      {
        id: 'm4',
        timestamp: Date.now() - 86400000 * 2 + 1000 * 60 * 13,
        type: 'milestone',
        title: 'Concept Check Passed',
        description: 'Child correctly identified all 4 parts when quizzed gently.',
      },
    ],
    transcript: [
      {
        id: 's1',
        role: 'student',
        text: 'Teacher, can you teach me about plants?',
        timestamp: Date.now() - 86400000 * 2 + 1000 * 60 * 1,
      },
      {
        id: 's2',
        role: 'teacher',
        text: 'Hello! I would love to! Plants are amazing living things. Let us look at the four important parts of a plant: roots, stem, leaves, and flower.',
        timestamp: Date.now() - 86400000 * 2 + 1000 * 60 * 2,
      },
    ],
    visuals: [],
    resumeContext:
      'In the previous lesson on Plants (Class 2), the child learned all 4 basic parts of a plant (roots, stem, leaves, flower) and learned about chlorophyll making leaves green. The child was curious about how plants drink water. Next topic recommended: How seeds germinate, or how rain helps plants grow.',
    tokensUsed: 1420,
  },
  {
    id: 'seed-session-2',
    startedAt: Date.now() - 86400000, // Yesterday
    endedAt: Date.now() - 86400000 + 1000 * 60 * 11,
    durationSeconds: 660,
    targetClass: 'Class 2',
    title: 'Introduction to Tamil Vowels: Letter "அ" (Ah)',
    summary:
      'Practiced the first Tamil uyir ezhuthu "அ" (Ah). The child learned its sound, pronunciation, and connected it with the word "அம்மா" (Amma).',
    keyLearnings: [
      'Recognized the first Tamil vowel letter "அ" (Ah).',
      'Understood that "அ" is the opening letter of the Tamil alphabet.',
      'Practiced saying "அ" clearly with words like "அம்மா" (Amma / Mother) and "அனில்" (Anil / Squirrel).',
    ],
    skillsCovered: ['Tamil Language', 'Letter Phonetics', 'Vocabulary Association'],
    timeline: [
      {
        id: 'm2-1',
        timestamp: Date.now() - 86400000 + 1000 * 60 * 2,
        type: 'concept',
        title: 'Sound of "அ" (Ah)',
        description: 'Practiced open-mouth sound "Ah" like singing.',
      },
      {
        id: 'm2-2',
        timestamp: Date.now() - 86400000 + 1000 * 60 * 5,
        type: 'visual',
        title: 'Tamil Letter "அ" Card Displayed',
        description: 'Rendered Unicode character "அ" with clear pronunciation label.',
      },
      {
        id: 'm2-3',
        timestamp: Date.now() - 86400000 + 1000 * 60 * 8,
        type: 'question',
        title: 'Word Association: "அம்மா"',
        description: 'Child proudly connected "அ" to "அம்மா" (Mother).',
        childQuestion: 'Is அ the first letter in Amma?',
        teacherHighlight: 'Confirmed enthusiastically and praised child.',
      },
    ],
    transcript: [
      {
        id: 't1',
        role: 'student',
        text: 'Can you teach me the first Tamil letter?',
        timestamp: Date.now() - 86400000 + 1000 * 60 * 1,
      },
      {
        id: 't2',
        role: 'teacher',
        text: 'Vanakkam! The very first letter in Tamil is "அ" (Ah). It is a beautiful vowel. Say it with me: "அ" as in "அம்மா" (Amma)!',
        timestamp: Date.now() - 86400000 + 1000 * 60 * 2,
      },
    ],
    visuals: [],
    resumeContext:
      'In the previous lesson on Tamil (Class 2), the child successfully learned the first vowel letter "அ" (Ah) and word "அம்மா". The next logical step is learning the second vowel letter "ஆ" (Aah) as in "ஆடு" (Aadu / Goat) or "ஆலமரம்" (Banyan tree), and comparing the short vs long vowel sounds.',
    tokensUsed: 1180,
  },
];

// Helper to load sessions from file
export function loadSessions(): LearningSession[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(INITIAL_SEED_SESSIONS, null, 2), 'utf-8');
      return INITIAL_SEED_SESSIONS;
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.startedAt - a.startedAt);
    }
    return INITIAL_SEED_SESSIONS;
  } catch (err) {
    console.error('Failed to read learning sessions file:', err);
    return INITIAL_SEED_SESSIONS;
  }
}

// Helper to save sessions to file
export function saveSessions(sessions: LearningSession[]): void {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write learning sessions file:', err);
  }
}

export function getAllSessions(): LearningSession[] {
  return loadSessions();
}

export function getSessionById(id: string): LearningSession | null {
  const sessions = loadSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function saveOrUpdateSession(sessionData: LearningSession): LearningSession {
  const sessions = loadSessions();
  const existingIdx = sessions.findIndex((s) => s.id === sessionData.id);

  if (existingIdx >= 0) {
    sessions[existingIdx] = {
      ...sessions[existingIdx],
      ...sessionData,
    };
  } else {
    sessions.unshift(sessionData);
  }

  saveSessions(sessions);
  return sessionData;
}

export function deleteSession(id: string): boolean {
  const sessions = loadSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  if (filtered.length !== sessions.length) {
    saveSessions(filtered);
    return true;
  }
  return false;
}

/**
 * Generates the "AI Memory / Resume Context" for the AI teacher.
 * This summary allows the AI to immediately acknowledge where the child left off,
 * greet them warmly, and resume without repetition.
 */
export function getLatestResumeContext(targetClass?: string): {
  hasHistory: boolean;
  latestSession: LearningSession | null;
  resumeInstructionText: string;
} {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    return {
      hasHistory: false,
      latestSession: null,
      resumeInstructionText: '',
    };
  }

  // Find most recent session matching targetClass or the latest overall
  const latest =
    (targetClass ? sessions.find((s) => s.targetClass === targetClass) : null) || sessions[0];

  const dateStr = new Date(latest.startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const resumeInstructionText = `
### Previous Learning History & Session Continuity (AI Memory)
You have a continuing learning relationship with this child (${latest.targetClass}).
Here is what the child learned in their previous session on ${dateStr}:
- Topic: ${latest.title}
- What the child mastered: ${latest.keyLearnings.slice(0, 3).join('; ')}
- Where the conversation left off: ${latest.resumeContext || latest.summary}

HOW TO GREET AND RESUME:
1. When the child says hello or begins speaking, warmly welcome them back like their ongoing teacher (e.g.: "Welcome back! In our last lesson, we were talking about ${latest.title}...").
2. Ask if they want to continue from where you left off, do a fun 30-second recap, or explore a new topic today.
3. Build directly on what they already know without re-teaching the basic points they already grasped.
`;

  return {
    hasHistory: true,
    latestSession: latest,
    resumeInstructionText,
  };
}

/**
 * Synthesizes an intelligent pedagogical summary of a session using Gemini.
 * Extracts title, key learnings, timeline milestones, and the resume memory snippet.
 */
export async function summarizeSessionWithAI(
  ai: GoogleGenAI,
  session: {
    targetClass: string;
    transcript: ChatMessage[];
    visuals: SessionVisual[];
  }
): Promise<{
  title: string;
  summary: string;
  keyLearnings: string[];
  skillsCovered: string[];
  timeline: TimelineMilestone[];
  resumeContext: string;
}> {
  // If transcript is very short, generate a clean default
  if (!session.transcript || session.transcript.length < 2) {
    const topic = session.visuals[0]?.topic || 'Introductory Exploration';
    return {
      title: `${topic} (${session.targetClass})`,
      summary: `A brief exploration of ${topic} with the AI teacher.`,
      keyLearnings: [`Explored concepts related to ${topic}.`],
      skillsCovered: ['General Knowledge', 'Inquiry'],
      timeline: [
        {
          id: `m-${Date.now()}`,
          timestamp: Date.now(),
          type: 'concept',
          title: `Introduced ${topic}`,
          description: `Teacher introduced ${topic} to the student.`,
        },
      ],
      resumeContext: `Child started learning about ${topic}. Ready to explore further or answer any questions.`,
    };
  }

  const transcriptText = session.transcript
    .filter((m) => m.role === 'student' || m.role === 'teacher')
    .map((m) => `${m.role === 'student' ? 'Child' : 'Teacher'}: ${m.text}`)
    .join('\n');

  const visualTopics = session.visuals.map((v) => v.topic).join(', ');

  const prompt = `You are an educational assistant analyzing a tutoring conversation between an AI teacher and a young child in ${session.targetClass}.

Here is the dialogue transcript:
${transcriptText}

Visuals generated during lesson: ${visualTopics || 'None'}

Please generate an educational progress summary for parents and for the AI teacher to resume later.
Return your response ONLY as valid JSON matching this exact structure:
{
  "title": "Short descriptive topic title (e.g., 'Parts of a Plant & Photosynthesis')",
  "summary": "2-3 sentences explaining for parents what the child learned and how they engaged.",
  "keyLearnings": [
    "Specific concept or fact 1 the child learned",
    "Specific concept or fact 2 the child learned",
    "Specific concept or fact 3 the child learned"
  ],
  "skillsCovered": ["Skill/Domain 1", "Skill/Domain 2", "Skill/Domain 3"],
  "timeline": [
    {
      "type": "concept",
      "title": "Short milestone title",
      "description": "What was explained or grasped"
    },
    {
      "type": "visual",
      "title": "Visual diagram observed",
      "description": "Details about the illustration seen"
    },
    {
      "type": "question",
      "title": "Child asked question",
      "description": "Summary of question and how it was answered",
      "childQuestion": "Question text"
    }
  ],
  "resumeContext": "2-3 sentences detailing exactly where the conversation left off and what the next logical lesson step should be when the child returns."
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    // Merge visual SVGs into timeline where relevant
    const timelineWithIds: TimelineMilestone[] = (parsed.timeline || []).map(
      (m: any, idx: number) => ({
        id: `milestone-${Date.now()}-${idx}`,
        timestamp: Date.now() - (parsed.timeline.length - idx) * 1000 * 60,
        type: m.type || 'concept',
        title: m.title || 'Learning Milestone',
        description: m.description || '',
        childQuestion: m.childQuestion,
        svgMarkup: session.visuals[idx]?.svgMarkup || undefined,
      })
    );

    return {
      title: parsed.title || 'Learning Session',
      summary: parsed.summary || 'The child engaged with the AI teacher.',
      keyLearnings: Array.isArray(parsed.keyLearnings)
        ? parsed.keyLearnings
        : ['Concept exploration'],
      skillsCovered: Array.isArray(parsed.skillsCovered)
        ? parsed.skillsCovered
        : ['General Learning'],
      timeline: timelineWithIds,
      resumeContext:
        parsed.resumeContext ||
        `The child learned about ${parsed.title || 'this topic'}. Ready to continue next time.`,
    };
  } catch (err) {
    console.warn('Failed to summarize session with AI, using fallback:', err);
    const firstStudentMsg = session.transcript.find((m) => m.role === 'student')?.text || '';
    const title =
      session.visuals[0]?.topic ||
      (firstStudentMsg.length > 5 ? firstStudentMsg.slice(0, 30) : 'Learning Session');

    return {
      title: `${title} (${session.targetClass})`,
      summary: `The child practiced and discussed ${title} with the AI teacher.`,
      keyLearnings: [
        `Explored key ideas in ${title}`,
        'Engaged in interactive dialogue with the teacher',
      ],
      skillsCovered: ['Listening & Speaking', 'Curiosity'],
      timeline: [
        {
          id: `m-fallback-1`,
          timestamp: Date.now(),
          type: 'concept',
          title: `Discussed ${title}`,
          description: 'Child participated in live tutoring.',
        },
      ],
      resumeContext: `Child covered ${title}. Next session can build on this or start a new topic.`,
    };
  }
}
