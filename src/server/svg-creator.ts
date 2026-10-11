import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export const INITIAL_SVG_SYSTEM_PROMPT = `You are an educational SVG illustrator for children in Classes 1–5.

Your job is to create a simple educational line drawing as valid SVG based on the user's request.

The drawing must be appropriate for the selected class level.

Visual style:
- Clean white background
- Simple textbook-style educational illustration
- Clear black/dark outlines
- Simple flat colours
- No photorealism
- No gradients
- No shadows
- No unnecessary decorative elements
- Large, recognizable shapes
- Clear labels when labels are useful for teaching
- Labels must be readable
- Use arrows when they help explain relationships
- Avoid excessive detail

Class-level complexity must be respected.

The SVG must be self-contained and directly renderable by a browser.

Return ONLY valid SVG markup.

Do not wrap the SVG in Markdown code fences.

Do not provide explanations outside the SVG.

Do not use external images, external URLs, external fonts, JavaScript, or external resources.

The SVG should have an appropriate viewBox and should scale correctly.

Prioritize educational clarity over artistic beauty.`;

export const CLASS_GUIDELINES: Record<string, string> = {
  'Class 1':
    'Class 1 complexity guidelines: Extremely simple, very large objects, thick outlines, very few colours, very few labels, minimal complexity.',
  'Class 2':
    'Class 2 complexity guidelines: Simple objects, thick outlines, simple colours, clear labels, slightly more detail.',
  'Class 3':
    'Class 3 complexity guidelines: Simple educational diagrams, more labels, basic arrows, moderate detail.',
  'Class 4':
    'Class 4 complexity guidelines: More structured educational diagrams, more terminology, moderate detail.',
  'Class 5':
    'Class 5 complexity guidelines: More detailed textbook-style diagrams, more terminology, still visually simple and child-friendly.',
};

export const svgCreatorFunctionDeclaration = {
  name: 'svg_creator',
  description:
    'Creates a simple, labelled educational SVG line diagram for children in Classes 1–5. Invoke this tool when a visual diagram, labelled chart, or picture will help explain the concept to the child. Important objects, stages, and concepts will have clear readable labels.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description:
          'The core concept or subject being illustrated (e.g., "Photosynthesis", "Parts of a Plant", "Water Cycle", "Fractions 1/2 and 1/4").',
      },
      targetClass: {
        type: Type.STRING,
        description:
          'The grade level of the child: "Class 1", "Class 2", "Class 3", "Class 4", or "Class 5".',
      },
      description: {
        type: Type.STRING,
        description:
          'Specific description of what visual elements, objects, arrows, and labels to include in the SVG drawing.',
      },
    },
    required: ['topic', 'description'],
  },
};

export function extractAndSanitizeSvg(raw: string): { svgMarkup: string | null; error: string | null } {
  if (!raw || !raw.trim()) {
    return { svgMarkup: null, error: 'Empty response received from SVG generator.' };
  }

  const startIdx = raw.indexOf('<svg');
  const endIdx = raw.lastIndexOf('</svg>');

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {
      svgMarkup: null,
      error: 'No valid <svg>...</svg> markup found in the model response.',
    };
  }

  let svgContent = raw.substring(startIdx, endIdx + 6).trim();

  // Strip script tags, inline javascript and dangerous event handlers
  svgContent = svgContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  svgContent = svgContent.replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  svgContent = svgContent.replace(/\bjavascript:\s*/gi, '');

  if (!svgContent.includes('xmlns=')) {
    svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return {
    svgMarkup: svgContent,
    error: null,
  };
}

export interface SvgExecutionResult {
  success: boolean;
  rawText: string;
  svgMarkup: string | null;
  error: string | null;
  usageMetadata: Record<string, unknown> | null;
  durationMs: number;
}

export async function executeSvgCreator(
  ai: GoogleGenAI,
  args: { topic: string; targetClass?: string; description: string }
): Promise<SvgExecutionResult> {
  const startTime = Date.now();
  const targetClass = args.targetClass || 'Class 2';
  const classGuideline = CLASS_GUIDELINES[targetClass] || CLASS_GUIDELINES['Class 2'];
  const fullPrompt = `Target Audience: ${targetClass}\n${classGuideline}\n\nDrawing request:\nTopic: ${args.topic}\nDetails: ${args.description}\n\nReturn ONLY the valid SVG markup.`;

  // Fallback models if 503 high-demand spike occurs
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite'];
  let lastError: unknown = null;

  for (const modelCandidate of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents: fullPrompt,
          config: {
            systemInstruction: INITIAL_SVG_SYSTEM_PROMPT,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            temperature: 0.2,
          },
        });

        const durationMs = Date.now() - startTime;
        const rawText = response.text || '';
        const { svgMarkup, error } = extractAndSanitizeSvg(rawText);

        return {
          success: !error && !!svgMarkup,
          rawText,
          svgMarkup,
          error,
          usageMetadata: (response.usageMetadata as Record<string, unknown>) || null,
          durationMs,
        };
      } catch (err: unknown) {
        lastError = err;
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isSpikeOrBusy =
          errorMsg.includes('503') ||
          errorMsg.includes('UNAVAILABLE') ||
          errorMsg.includes('high demand') ||
          errorMsg.includes('429');

        if (isSpikeOrBusy && attempt === 0) {
          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        // If high-demand spike on this model, failover to the next candidate model
        if (isSpikeOrBusy) {
          break;
        }

        // If non-503 fatal error, exit loop
        const durationMs = Date.now() - startTime;
        return {
          success: false,
          rawText: '',
          svgMarkup: null,
          error: `SVG generation failed: ${errorMsg}`,
          usageMetadata: null,
          durationMs,
        };
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError);
  return {
    success: false,
    rawText: '',
    svgMarkup: null,
    error: `SVG generation failed after retry: ${finalErrorMsg}`,
    usageMetadata: null,
    durationMs,
  };
}
