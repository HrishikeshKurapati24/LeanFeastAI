/**
 * Step Normalization Utility
 * Transforms backend recipe steps into normalized format with duration extraction
 * and user-action detection using advanced NLP parsing
 */

export interface NormalizedStep {
    id: string;
    index: number;
    text: string;
    timer_seconds?: number;
    requires_user?: boolean;
    image_url?: string;
}

interface BackendStep {
    step_number?: number;
    instruction?: string;
    text?: string;
    image_url?: string;
}

/**
 * Extract duration in seconds from step text using NLP patterns
 */
const extractDuration = (text: string): number | undefined => {
    const normalized = text.toLowerCase();

    // Patterns for time extraction (ordered by specificity - more specific first)
    const patterns = [
        // "cook for 10 minutes" -> 600 seconds (with verb prefix)
        { regex: /(?:cook|bake|roast|simmer|boil|steam|fry|grill|heat|warm|melt|reduce|rest|let|wait|leave|keep|hold|marinate|soak|steep|infuse|steep|proof|rise|ferment)\s+(?:for\s+)?(\d+)\s*(?:minute|min|m)(?:ute|s)?/gi, multiplier: 60 },
        // "cook for 2 hours" -> 7200 seconds (with verb prefix)
        { regex: /(?:cook|bake|roast|simmer|boil|steam|fry|grill|heat|warm|melt|reduce|rest|let|wait|leave|keep|hold|marinate|soak|steep|infuse|steep|proof|rise|ferment)\s+(?:for\s+)?(\d+)\s*(?:hour|hr|h)(?:s)?/gi, multiplier: 3600 },
        // "cook for 30 seconds" -> 30 seconds (with verb prefix)
        { regex: /(?:cook|bake|roast|simmer|boil|steam|fry|grill|heat|warm|melt|reduce|rest|let|wait|leave|keep|hold|marinate|soak|steep|infuse|steep|proof|rise|ferment)\s+(?:for\s+)?(\d+)\s*(?:second|sec|s)(?:ond|s)?/gi, multiplier: 1 },
        // "5-10 minutes" -> use average (7.5 minutes = 450 seconds)
        { regex: /(\d+)\s*[-–—]\s*(\d+)\s*(?:minute|min|m)(?:ute|s)?/gi, multiplier: 60, isRange: true },
        // "5-10 hours" -> use average
        { regex: /(\d+)\s*[-–—]\s*(\d+)\s*(?:hour|hr|h)(?:s)?/gi, multiplier: 3600, isRange: true },
        // "about 5 minutes" -> 300 seconds
        { regex: /(?:about|approximately|approx|around|roughly)\s+(\d+)\s*(?:minute|min|m)(?:ute|s)?/gi, multiplier: 60 },
        // "about 6 hours" -> 21600 seconds
        { regex: /(?:about|approximately|approx|around|roughly)\s+(\d+)\s*(?:hour|hr|h)(?:s)?/gi, multiplier: 3600 },
        // Standalone durations: "10 minutes", "10 min", "10 m" -> 600 seconds
        { regex: /\b(\d+)\s*(?:minute|min|m)(?:ute|s)?\b/gi, multiplier: 60 },
        // Standalone hours: "6 hours", "6 hr", "6 h" -> 21600 seconds (improved pattern)
        { regex: /\b(\d+)\s*(?:hour|hr|h)(?:s)?\b/gi, multiplier: 3600 },
        // Standalone seconds: "30 seconds", "30 sec", "30 s" -> 30 seconds
        { regex: /\b(\d+)\s*(?:second|sec|s)(?:ond|s)?\b/gi, multiplier: 1 },
    ];

    for (const pattern of patterns) {
        const matches = [...normalized.matchAll(pattern.regex)];
        if (matches.length > 0) {
            const match = matches[0];
            if (pattern.isRange && match[1] && match[2]) {
                const min = parseInt(match[1], 10);
                const max = parseInt(match[2], 10);
                const average = Math.round((min + max) / 2);
                return average * pattern.multiplier;
            } else if (match[1]) {
                const value = parseInt(match[1], 10);
                return value * pattern.multiplier;
            }
        }
    }

    return undefined;
};

/**
 * Detect if step requires user action using keyword matching and context
 */
const requiresUserAction = (text: string): boolean => {
    const normalized = text.toLowerCase();

    // Action verbs that require user interaction
    const actionKeywords = [
        'add', 'stir', 'mix', 'whisk', 'beat', 'fold', 'pour', 'transfer',
        'place', 'put', 'arrange', 'layer', 'spread', 'sprinkle', 'drizzle',
        'garnish', 'season', 'salt', 'pepper', 'chop', 'dice', 'slice', 'cut',
        'mince', 'grate', 'peel', 'trim', 'remove', 'discard', 'drain',
        'strain', 'squeeze', 'zest', 'juice', 'crush', 'mash', 'press',
        'knead', 'roll', 'shape', 'form', 'stuff', 'fill', 'wrap',
        'turn', 'flip', 'rotate', 'shake', 'toss', 'combine', 'blend',
        'process', 'pulse', 'grind', 'crush', 'pound', 'tenderize',
        'score', 'pierce', 'poke', 'brush', 'baste', 'glaze', 'coat',
        'dredge', 'flour', 'batter', 'dip', 'soak', 'marinate', 'rub',
        'massage', 'press', 'pack', 'tamp', 'level', 'smooth', 'flatten',
        'pound', 'tenderize', 'score', 'pierce', 'poke', 'brush', 'baste',
        'glaze', 'coat', 'dredge', 'flour', 'batter', 'dip', 'soak',
        'marinate', 'rub', 'massage', 'press', 'pack', 'tamp', 'level',
        'smooth', 'flatten', 'serve', 'plate', 'garnish', 'decorate',
        'arrange', 'present', 'divide', 'portion', 'slice', 'cut', 'carve'
    ];

    // Passive/monitoring keywords (doesn't require active user action)
    const passiveKeywords = [
        'simmer', 'cook', 'bake', 'roast', 'heat', 'warm', 'melt',
        'reduce', 'thicken', 'cool', 'chill', 'rest', 'sit', 'stand',
        'wait', 'let', 'allow', 'keep', 'maintain', 'hold', 'preserve',
        'monitor', 'watch', 'check', 'observe', 'look', 'see', 'notice',
        'until', 'when', 'once', 'after', 'during', 'while'
    ];

    // Check for action keywords at the start of sentences or after common prefixes
    const sentences = normalized.split(/[.!?;]\s*/);
    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        // Check if sentence starts with action verb
        for (const keyword of actionKeywords) {
            if (trimmed.startsWith(keyword + ' ') || trimmed.startsWith(keyword + ',')) {
                return true;
            }
        }

        // Check for imperative patterns (commands)
        if (/^(add|stir|mix|pour|place|put|chop|slice|cut|season|garnish)/i.test(trimmed)) {
            return true;
        }
    }

    // If no clear action verbs, check if it's mostly passive
    const passiveCount = passiveKeywords.filter(kw => normalized.includes(kw)).length;
    const actionCount = actionKeywords.filter(kw => normalized.includes(kw)).length;

    // If more action keywords than passive, likely requires user
    return actionCount > passiveCount;
};

/**
 * Split compound steps if needed
 * Example: "Add salt and pepper, then stir for 2 minutes" -> two steps
 */
const splitCompoundStep = (text: string): string[] => {
    // Common separators for compound steps
    const separators = [
        /,\s+then\s+/i,
        /,\s+and\s+then\s+/i,
        /\.\s+Then\s+/i,
        /\.\s+Next\s+/i,
        /\.\s+After\s+that\s+/i,
        /;\s+/i,
    ];

    for (const separator of separators) {
        if (separator.test(text)) {
            return text.split(separator).map(s => s.trim()).filter(s => s.length > 0);
        }
    }

    return [text];
};

/**
 * Normalize a single step
 */
export const normalizeStep = (
    backendStep: BackendStep,
    index: number
): NormalizedStep[] => {
    const text = backendStep.instruction || backendStep.text || '';
    const stepNumber = backendStep.step_number ?? index + 1;

    // Split compound steps
    const stepTexts = splitCompoundStep(text);

    // Normalize each split step
    return stepTexts.map((stepText, subIndex) => {
        const timerSeconds = extractDuration(stepText);
        const requiresUser = requiresUserAction(stepText);

        return {
            id: `${stepNumber}-${subIndex}`,
            index: index + subIndex,
            text: stepText,
            timer_seconds: timerSeconds,
            requires_user: requiresUser,
            image_url: subIndex === 0 ? backendStep.image_url : undefined, // Only first sub-step gets image
        };
    });
};

/**
 * Normalize all steps in a recipe
 */
export const normalizeSteps = (backendSteps: BackendStep[]): NormalizedStep[] => {
    const normalized: NormalizedStep[] = [];
    let currentIndex = 0;

    for (let i = 0; i < backendSteps.length; i++) {
        const stepResults = normalizeStep(backendSteps[i], currentIndex);
        normalized.push(...stepResults);
        currentIndex += stepResults.length;
    }

    return normalized;
};

