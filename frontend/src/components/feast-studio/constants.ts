export const flavorOptions = [
    "Light & Fresh",
    "Bold & Spicy",
    "Sweet & Comforting",
    "Creamy & Rich",
    "Savory & Hearty",
    "Mild & Balanced",
];

export const flavorControls = {
    Breakfast: {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    Lunch: {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    Dinner: {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    Snack: {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    "Post-Workout": {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    "Pre-Workout": {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    Dessert: {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    },
    Appetizer: {
        fields: {
            flavor: flavorOptions,
            cookingSkillLevel: ["Beginner", "Intermediate", "Advanced"]
        }
    }
};

export const mealTypeOptions = Object.keys(flavorControls);

export const conversationalLabels: Record<string, Record<string, string>> = {
    flavor: { label: "What flavor profile are you craving?", question: "What kind of flavors do you want?" },
    cookingSkillLevel: { label: "What's your cooking skill level?", question: "How comfortable are you in the kitchen?" },
};

export const steps = [
    { number: 1, name: 'Core Info', title: 'Core Information' },
    { number: 2, name: 'Personalization', title: 'Personalization' },
    { number: 3, name: 'Optional', title: 'Additional Preferences' },
    { number: 4, name: 'Preview', title: 'Preview & Confirm' },
];

// Helper function to get smart default for flavor fields
export const getSmartDefault = (fieldName: string, options: string[]): string => {
    // For flavor, return empty string (optional field, no default)
    if (fieldName === 'flavor') {
        return '';
    }

    // For cooking skill level, default to "Intermediate"
    if (fieldName === 'cookingSkillLevel') {
        return options.find(opt => opt === 'Intermediate') || options[Math.floor(options.length / 2)];
    }

    // First try to find "Medium" or "Balanced" (common default options)
    const mediumOption = options.find(opt =>
        opt.toLowerCase().includes('medium') ||
        opt.toLowerCase().includes('balanced') ||
        opt.toLowerCase() === 'moderate'
    );
    if (mediumOption) return mediumOption;

    // Otherwise, select the middle option
    const middleIndex = Math.floor(options.length / 2);
    return options[middleIndex];
};

export const getFieldLabel = (fieldName: string): string => {
    const label = conversationalLabels[fieldName];
    return label ? label.label : fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};