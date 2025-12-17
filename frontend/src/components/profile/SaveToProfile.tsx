import { useState, useEffect } from "react";
import ImageUpload from "../ImageUpload";

interface RecipeStep {
    text: string;
    step_type?: "active" | "passive" | "wait";
}

interface ShareToCommunityFormProps {
    onSubmit: (data: {
        image: File | null;
        title: string;
        description: string;
        tags: string[];
        isAiGenerated: boolean;
        steps?: RecipeStep[];
    }) => void;
    loading?: boolean;
    initialTitle?: string;
    initialDescription?: string;
    initialTags?: string[];
    initialImageUrl?: string | null;
    initialSteps?: RecipeStep[];
    initialIsAiGenerated?: boolean;
}

const predefinedTags = [
    "High Protein",
    "Quick Breakfast",
    "Vegan",
    "Low Calorie",
    "Dessert",
    "Main Course",
    "Appetizer",
    "Snack",
    "Gluten-Free",
    "Keto",
    "Healthy",
    "Comfort Food",
];

export default function ShareToCommunityForm({
    onSubmit,
    loading = false,
    initialTitle = "",
    initialDescription = "",
    initialTags = [],
    initialImageUrl = null,
    initialSteps = [],
    initialIsAiGenerated = false,
}: ShareToCommunityFormProps) {
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
    const [customTag, setCustomTag] = useState("");
    const [isAiGenerated, setIsAiGenerated] = useState(initialIsAiGenerated);
    const [steps, setSteps] = useState<RecipeStep[]>(initialSteps.length > 0 ? initialSteps : [{ text: "", step_type: "active" }]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update form when initial values change
    useEffect(() => {
        if (initialTitle) setTitle(initialTitle);
        if (initialDescription) setDescription(initialDescription);
        if (initialTags && initialTags.length > 0) setSelectedTags(initialTags);
        if (initialImageUrl) setImagePreview(initialImageUrl);
        if (initialSteps && initialSteps.length > 0) setSteps(initialSteps);
    }, [initialTitle, initialDescription, initialTags, initialImageUrl, initialSteps]);

    const handleImageSelect = (file: File | null) => {
        setImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const addCustomTag = () => {
        if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
            setSelectedTags((prev) => [...prev, customTag.trim()]);
            setCustomTag("");
        }
    };

    const removeTag = (tag: string) => {
        setSelectedTags((prev) => prev.filter((t) => t !== tag));
    };

    const addStep = () => {
        setSteps((prev) => [...prev, { text: "", step_type: "active" }]);
    };

    const removeStep = (index: number) => {
        setSteps((prev) => prev.filter((_, i) => i !== index));
    };

    const updateStep = (index: number, field: 'text' | 'step_type', value: string) => {
        setSteps((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                [field]: value
            };
            return updated;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = "Please enter a title";
        }

        if (!description.trim()) {
            newErrors.description = "Please enter a description";
        }

        // Validate steps - filter out empty steps and ensure step_type is set
        const validSteps = steps
            .filter(step => step.text.trim() !== "")
            .map(step => ({
                ...step,
                step_type: step.step_type || "active" // Default to "active" if not provided
            }));

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit({
            image,
            title: title.trim(),
            description: description.trim(),
            tags: selectedTags,
            isAiGenerated,
            steps: validSteps.length > 0 ? validSteps : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Image Upload */}
            <ImageUpload
                onImageSelect={handleImageSelect}
                preview={imagePreview}
                label="Recipe Image"
            />

            {/* Title */}
            <div>
                <label htmlFor="share-title" className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    Title <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="share-title"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) {
                            setErrors((prev) => ({ ...prev, title: "" }));
                        }
                    }}
                    className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 rounded-lg sm:rounded-xl border-2 transition-colors text-sm sm:text-base ${errors.title
                        ? "border-red-500 focus:border-red-500"
                        : "border-neutral-200 focus:border-primary"
                        } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50`}
                    placeholder="e.g., My Signature Spicy Chicken Curry"
                />
                {errors.title && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.title}</p>
                )}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="share-description" className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    Short Description <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="share-description"
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description) {
                            setErrors((prev) => ({ ...prev, description: "" }));
                        }
                    }}
                    rows={3}
                    className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 rounded-lg sm:rounded-xl border-2 transition-colors text-sm sm:text-base ${errors.description
                        ? "border-red-500 focus:border-red-500"
                        : "border-neutral-200 focus:border-primary"
                        } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 resize-none`}
                    placeholder="Describe your recipe... What makes it special?"
                />
                {errors.description && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.description}</p>
                )}
            </div>

            {/* Tags */}
            <div>
                <label className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-2 sm:mb-2.5 md:mb-3">
                    Tags
                </label>

                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-2.5 md:mb-3">
                        {selectedTags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="hover:text-red-500 transition-colors"
                                    aria-label={`Remove tag ${tag}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Predefined Tags */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-2.5 md:mb-3">
                    {predefinedTags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 rounded-lg sm:rounded-xl border-2 transition-all text-xs sm:text-sm ${selectedTags.includes(tag)
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-neutral-200 bg-white/50 text-neutral-700 hover:border-primary/50"
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-1.5 sm:gap-2">
                    <input
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomTag();
                            }
                        }}
                        placeholder="Add custom tag..."
                        className="flex-1 px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 rounded-lg sm:rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 text-sm sm:text-base"
                    />
                    <button
                        type="button"
                        onClick={addCustomTag}
                        className="px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-42 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Recipe Steps/Instructions */}
            <div>
                <label className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-2 sm:mb-2.5 md:mb-3">
                    Cooking Instructions
                </label>
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                    {steps.map((step, index) => (
                        <div key={index} className="flex gap-2 sm:gap-2.5 md:gap-3 items-start p-2 sm:p-2.5 md:p-3 bg-white/50 rounded-lg sm:rounded-xl border-2 border-neutral-200">
                            <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm mt-1">
                                {index + 1}
                            </div>
                            <div className="flex-1 space-y-1.5 sm:space-y-2">
                                <textarea
                                    value={step.text}
                                    onChange={(e) => updateStep(index, 'text', e.target.value)}
                                    placeholder={`Step ${index + 1} instruction...`}
                                    rows={2}
                                    className="w-full px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 rounded-lg border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none text-xs sm:text-sm"
                                />
                            </div>
                            {steps.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeStep(index)}
                                    className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors text-base sm:text-lg font-bold"
                                    aria-label={`Remove step ${index + 1}`}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addStep}
                        className="w-full px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 border-2 border-dashed border-neutral-300 hover:border-primary rounded-lg sm:rounded-xl text-neutral-61 hover:text-primary transition-colors text-xs sm:text-sm font-semibold"
                    >
                        + Add Step
                    </button>
                </div>
                <p className="mt-1.5 sm:mt-2 text-xs text-neutral-61">
                    Add steps for your recipe.
                </p>
            </div>

            {/* AI Generated Toggle */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-3 sm:p-3.5 md:p-4 bg-neutral-50 rounded-lg sm:rounded-xl hidden">
                <input
                    type="checkbox"
                    id="ai-generated"
                    checked={isAiGenerated}
                    onChange={(e) => setIsAiGenerated(e.target.checked)}
                    className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded border-neutral-300 text-primary focus:ring-primary hidden"
                />
                <label htmlFor="ai-generated" className="text-xs sm:text-sm font-semibold text-neutral-42 cursor-pointer hidden">
                    Generated by AI
                </label>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 sm:py-3.5 sm:px-5 md:py-4 md:px-6 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg"
            >
                {loading ? "Saving to profile... 🍽️" : "Save to profile 🍽️"}
            </button>
        </form>
    );
}