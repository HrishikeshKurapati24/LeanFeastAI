/**
 * Converts fractions in text to words for better TTS pronunciation
 * Examples: 1/2 -> half, 1/4 -> quarter, 3/4 -> three-quarters
 */
export const convertFractionsToWords = (text: string): string => {
    // Map of common fractions to their word equivalents
    const fractionMap: Record<string, string> = {
        '1/2': 'half',
        '1/4': 'quarter',
        '3/4': 'three-quarters',
        '1/3': 'one-third',
        '2/3': 'two-thirds',
        '1/8': 'one-eighth',
        '3/8': 'three-eighths',
        '5/8': 'five-eighths',
        '7/8': 'seven-eighths',
    };

    let convertedText = text;

    // Replace fractions (case-insensitive, with word boundaries)
    // Match patterns like "1/2", " 1/2 ", "1/2 cup", etc.
    Object.entries(fractionMap).forEach(([fraction, word]) => {
        // Create regex pattern that matches the fraction with word boundaries
        // This ensures we don't match fractions that are part of larger numbers
        const regex = new RegExp(`\\b${fraction.replace('/', '\\/')}\\b`, 'gi');
        convertedText = convertedText.replace(regex, word);
    });

    return convertedText;
};

