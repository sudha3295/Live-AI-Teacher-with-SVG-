import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { LearningSession, TimelineMilestone, SessionVisual, ChatMessage } from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_DIR = path.resolve(DATA_DIR, 'users');
const LEGACY_SESSIONS_FILE = path.resolve(DATA_DIR, 'learning-sessions.json');

// Ensure data and users directory exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

/**
 * Sanitizes an email address or user identifier into a safe directory name
 */
export function sanitizeUserKey(userKey?: string): string {
  if (!userKey || userKey.trim() === '' || userKey.toLowerCase() === 'guest') {
    return 'guest';
  }
  return userKey
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.-]/g, '_');
}

/**
 * Resolves the private isolated storage file for a specific user.
 * Each user gets their own sandboxed folder under /data/users/<sanitized_email>/
 */
export function getUserSessionsFile(userKey?: string): string {
  const sanitized = sanitizeUserKey(userKey);
  const userFolder = path.resolve(USERS_DIR, sanitized);
  if (!fs.existsSync(userFolder)) {
    fs.mkdirSync(userFolder, { recursive: true });
  }
  return path.resolve(userFolder, 'learning-sessions.json');
}

// Initial seed sessions
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
        description: 'Rendered character "அ" with clear pronunciation label.',
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

// Helper to load sessions from user's isolated file
export function loadSessions(userKey?: string): LearningSession[] {
  const filePath = getUserSessionsFile(userKey);
  const isGuest = sanitizeUserKey(userKey) === 'guest';
  try {
    if (!fs.existsSync(filePath)) {
      // For guest, check legacy file first or use initial seeds
      let initial: LearningSession[] = [];
      if (isGuest) {
        if (fs.existsSync(LEGACY_SESSIONS_FILE)) {
          try {
            initial = JSON.parse(fs.readFileSync(LEGACY_SESSIONS_FILE, 'utf-8'));
          } catch {
            initial = INITIAL_SEED_SESSIONS;
          }
        } else {
          initial = INITIAL_SEED_SESSIONS;
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.startedAt - a.startedAt);
    }
    return isGuest ? INITIAL_SEED_SESSIONS : [];
  } catch (err) {
    console.error(`Failed to read learning sessions file for ${userKey}:`, err);
    return isGuest ? INITIAL_SEED_SESSIONS : [];
  }
}

// Helper to save sessions to user's isolated file
export function saveSessions(sessions: LearningSession[], userKey?: string): void {
  const filePath = getUserSessionsFile(userKey);
  try {
    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write learning sessions file for ${userKey}:`, err);
  }
}

export function getAllSessions(userKey?: string): LearningSession[] {
  return loadSessions(userKey);
}

export function getSessionById(id: string, userKey?: string): LearningSession | null {
  const sessions = loadSessions(userKey);
  return sessions.find((s) => s.id === id) || null;
}

export function saveOrUpdateSession(sessionData: LearningSession, userKey?: string): LearningSession {
  const sessions = loadSessions(userKey);
  const existingIdx = sessions.findIndex((s) => s.id === sessionData.id);

  if (existingIdx >= 0) {
    sessions[existingIdx] = {
      ...sessions[existingIdx],
      ...sessionData,
    };
  } else {
    sessions.unshift(sessionData);
  }

  saveSessions(sessions, userKey);
  return sessionData;
}

export function deleteSession(id: string, userKey?: string): boolean {
  const sessions = loadSessions(userKey);
  const filtered = sessions.filter((s) => s.id !== id);
  if (filtered.length !== sessions.length) {
    saveSessions(filtered, userKey);
    return true;
  }
  return false;
}

/**
 * Generates the "AI Memory / Resume Context" for Truncky AI for a specific user.
 * Allows the AI to immediately acknowledge where this child left off,
 * greet them warmly, and resume without repetition.
 */
export function getLatestResumeContext(targetClass?: string, userKey?: string): {
  hasHistory: boolean;
  latestSession: LearningSession | null;
  resumeInstructionText: string;
} {
  const sessions = loadSessions(userKey);
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
1. When the child says hello or begins speaking, warmly welcome them back like their ongoing elephant teacher Truncky (e.g.: "Welcome back! In our last lesson, we were talking about ${latest.title}...").
2. Ask if they want to continue from where you left off, do a fun 30-second recap, or explore a brand new topic today.
3. If they deviate to a new topic (e.g. asking about animals, letters, space), enthusiastically embrace the new topic! The system will automatically record it as a separate learning timeline entry.
4. Build directly on what they already know without re-teaching the basic points they already grasped.
`;

  return {
    hasHistory: true,
    latestSession: latest,
    resumeInstructionText,
  };
}

/**
 * Synthesizes an intelligent pedagogical summary of a session using Gemini.
 * CRITICAL FEATURE: Automatically detects topic deviations/transitions!
 * If the conversation began on Topic A (e.g. from resume) and then shifted to Topic B,
 * this function splits the dialogue into separate, distinct LearningSession entries
 * so each subject gets its own clean timeline record.
 */
export async function summarizeAndSegmentSessionsWithAI(
  ai: GoogleGenAI,
  session: {
    targetClass: string;
    transcript: ChatMessage[];
    visuals: SessionVisual[];
    durationSeconds?: number;
    startedAt?: number;
    endedAt?: number;
    tokensUsed?: number;
  },
  userKey?: string
): Promise<LearningSession[]> {
  const baseStartedAt = session.startedAt || Date.now() - (session.durationSeconds || 120) * 1000;
  const baseEndedAt = session.endedAt || Date.now();
  const totalDuration = session.durationSeconds || Math.max(30, Math.round((baseEndedAt - baseStartedAt) / 1000));

  // If transcript is very short, generate a clean single default
  if (!session.transcript || session.transcript.length < 2) {
    const topic = session.visuals[0]?.topic || 'Introductory Lesson';
    const singleSession: LearningSession = {
      id: `session-${Date.now()}`,
      startedAt: baseStartedAt,
      endedAt: baseEndedAt,
      durationSeconds: totalDuration,
      targetClass: session.targetClass,
      title: `${topic} (${session.targetClass})`,
      summary: `A brief exploration of ${topic} with Truncky AI.`,
      keyLearnings: [`Explored concepts related to ${topic}.`],
      skillsCovered: ['General Knowledge', 'Inquiry'],
      timeline: [
        {
          id: `m-${Date.now()}`,
          timestamp: Date.now(),
          type: 'concept',
          title: `Introduced ${topic}`,
          description: `Truncky introduced ${topic} to the student.`,
        },
      ],
      transcript: session.transcript || [],
      visuals: session.visuals || [],
      resumeContext: `Child started learning about ${topic}. Ready to explore further or answer any questions.`,
      tokensUsed: session.tokensUsed || 0,
    };
    saveOrUpdateSession(singleSession);
    return [singleSession];
  }

  const transcriptText = session.transcript
    .filter((m) => m.role === 'student' || m.role === 'teacher')
    .map((m, idx) => `[Message ${idx}] ${m.role === 'student' ? 'Child' : 'Teacher'}: ${m.text}`)
    .join('\n');

  const visualSummary = session.visuals
    .map((v) => `Visual [${v.type || 'svg'}]: "${v.topic}" (${v.description || ''})`)
    .join(', ');

  const prompt = `You are an educational psychologist and timeline analyzer for young children in ${session.targetClass}.

Here is the dialogue transcript:
${transcriptText}

Visuals generated: ${visualSummary || 'None'}

CRITICAL TASK: TOPIC DEVIATION DETECTION & TIMELINE SEGMENTATION
Young children often start on one topic (or resume from a previous lesson, e.g. "Plants & Chlorophyll") and then deviate or shift to a completely different subject (e.g. "Writing Tamil letter Ka", "The Solar System", "Dinosaurs", "Adding numbers").

Examine whether this interaction covered:
- A single topic: return 1 item in "topics".
- Multiple distinct topics (topic deviation): return multiple sequential items in "topics" so that parents can see separate timeline entries for each distinct topic explored!

Return your response ONLY as valid JSON matching this exact structure:
{
  "topics": [
    {
      "title": "Short descriptive topic title (e.g., 'Parts of a Plant & Photosynthesis' or 'Writing Tamil Letter அ')",
      "summary": "2-3 sentences explaining for parents what the child learned on this specific topic.",
      "keyLearnings": [
        "Specific concept or fact 1 the child learned",
        "Specific concept or fact 2 the child learned",
        "Specific concept or fact 3 the child learned"
      ],
      "skillsCovered": ["Skill/Domain 1", "Skill/Domain 2"],
      "timeline": [
        {
          "type": "concept",
          "title": "Short milestone title",
          "description": "What was explained or grasped"
        },
        {
          "type": "visual",
          "title": "Visual seen",
          "description": "Details about drawing or picture"
        },
        {
          "type": "question",
          "title": "Child asked question",
          "description": "Summary of question and answer",
          "childQuestion": "Question text"
        }
      ],
      "resumeContext": "2-3 sentences detailing exactly where this topic left off and what is logical to explore next when returning.",
      "visualTopicKeywords": ["keyword1", "keyword2"]
    }
  ]
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
    const parsedTopics = Array.isArray(parsed.topics) && parsed.topics.length > 0 ? parsed.topics : [parsed];

    const resultingSessions: LearningSession[] = [];
    const segmentCount = parsedTopics.length;
    const durationPerSegment = Math.max(20, Math.floor(totalDuration / segmentCount));

    parsedTopics.forEach((t: any, idx: number) => {
      const segStart = baseStartedAt + idx * durationPerSegment * 1000;
      const segEnd = idx === segmentCount - 1 ? baseEndedAt : segStart + durationPerSegment * 1000;
      const sessionId = `session-${Date.now()}-${idx}`;

      // Associate visuals matching this topic's keywords or split evenly
      const matchingVisuals = session.visuals.filter((v) => {
        if (!t.visualTopicKeywords || !Array.isArray(t.visualTopicKeywords)) return true;
        const topicLower = v.topic.toLowerCase();
        return t.visualTopicKeywords.some((kw: string) => topicLower.includes(String(kw).toLowerCase()));
      });

      const assignedVisuals = matchingVisuals.length > 0 ? matchingVisuals : (idx === 0 ? session.visuals : []);

      // Build timeline with IDs and attach visuals
      const timelineWithIds: TimelineMilestone[] = (t.timeline || []).map((m: any, mIdx: number) => {
        const assignedVisual = assignedVisuals[mIdx];
        return {
          id: `milestone-${Date.now()}-${idx}-${mIdx}`,
          timestamp: segStart + (mIdx + 1) * Math.floor((durationPerSegment * 1000) / (t.timeline.length + 1)),
          type: m.type || 'concept',
          title: m.title || 'Learning Milestone',
          description: m.description || '',
          childQuestion: m.childQuestion,
          visualType: assignedVisual?.type || 'svg',
          svgMarkup: assignedVisual?.type === 'svg' ? assignedVisual.svgMarkup : undefined,
          imageUrl: assignedVisual?.type === 'image' ? assignedVisual.imageUrl : undefined,
        };
      });

      const sessionObj: LearningSession = {
        id: sessionId,
        startedAt: segStart,
        endedAt: segEnd,
        durationSeconds: Math.max(15, Math.round((segEnd - segStart) / 1000)),
        targetClass: session.targetClass,
        title: t.title || `Learning Topic ${idx + 1}`,
        summary: t.summary || 'The child engaged in interactive learning with Truncky.',
        keyLearnings: Array.isArray(t.keyLearnings) ? t.keyLearnings : ['Concept exploration'],
        skillsCovered: Array.isArray(t.skillsCovered) ? t.skillsCovered : ['General Learning'],
        timeline: timelineWithIds,
        transcript: session.transcript,
        visuals: assignedVisuals,
        resumeContext:
          t.resumeContext || `The child learned about ${t.title || 'this topic'}. Ready to continue next time.`,
        tokensUsed: Math.floor((session.tokensUsed || 0) / segmentCount),
      };

      saveOrUpdateSession(sessionObj, userKey);
      resultingSessions.push(sessionObj);
    });

    return resultingSessions;
  } catch (err) {
    console.warn('Failed to segment session with AI, using single session fallback:', err);
    const firstStudentMsg = session.transcript.find((m) => m.role === 'student')?.text || '';
    const title =
      session.visuals[0]?.topic ||
      (firstStudentMsg.length > 5 ? firstStudentMsg.slice(0, 30) : 'Learning Session');

    const singleSession: LearningSession = {
      id: `session-${Date.now()}`,
      startedAt: baseStartedAt,
      endedAt: baseEndedAt,
      durationSeconds: totalDuration,
      targetClass: session.targetClass,
      title: `${title} (${session.targetClass})`,
      summary: `The child practiced and discussed ${title} with Truncky AI.`,
      keyLearnings: [`Explored key ideas in ${title}`, 'Engaged in interactive dialogue with Truncky'],
      skillsCovered: ['Listening & Speaking', 'Curiosity'],
      timeline: [
        {
          id: `m-fallback-1`,
          timestamp: Date.now(),
          type: 'concept',
          title: `Discussed ${title}`,
          description: 'Child participated in live tutoring with Truncky.',
        },
      ],
      transcript: session.transcript || [],
      visuals: session.visuals || [],
      resumeContext: `Child covered ${title}. Next session can build on this or start a new topic.`,
      tokensUsed: session.tokensUsed || 0,
    };

    saveOrUpdateSession(singleSession, userKey);
    return [singleSession];
  }
}
