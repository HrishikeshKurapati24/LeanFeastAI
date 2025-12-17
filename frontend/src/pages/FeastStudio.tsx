import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabaseClient";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectRecentMeals, selectRecentMealsMeta } from "../store/selectors/userSelectors";
import { fetchRecentMeals } from "../store/thunks/userThunks";
import FloatingFoodIcons from "../components/FloatingFoodIcons";
import OptimizeMealForm from "../components/feast-studio/OptimizeMealForm";
import OptimizedRecipeView from "../components/feast-studio/OptimizedRecipeView";
import CollapsibleSection from "../components/feast-studio/CollapsibleSection";
import RecentMeals from "../components/feast-studio/RecentMeals";
import ProgressIndicator from "../components/feast-studio/ProgressIndicator";
import QuickGenerateForm from "../components/feast-studio/QuickGenerateForm";
import Step1CoreInformation from "../components/feast-studio/Step1CoreInformation";
import Step2Personalization from "../components/feast-studio/Step2Personalization";
import Step3AdditionalPreferences from "../components/feast-studio/Step3AdditionalPreferences";
import Step4PreviewConfirm from "../components/feast-studio/Step4PreviewConfirm";
import CookingAssistantPanel from "../components/feast-studio/CookingAssistantPanel";
import FeastStudioHero from "../components/feast-studio/FeastStudioHero";
import RecipeGenerationSpinner from "../components/feast-studio/RecipeGenerationSpinner";
import SuccessTransition from "../components/feast-studio/SuccessTransition";
import type {
    FormData,
    FieldErrors,
    OptimizeFormData,
} from "../components/feast-studio/types";
import { STORAGE_KEY } from "../components/feast-studio/types";
import {
    flavorControls,
    flavorOptions,
    getSmartDefault,
    steps,
} from "../components/feast-studio/constants";

export default function FeastStudio() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Redirect to login if user is not authenticated
    useEffect(() => {
        if (!user?.id) {
            navigate('/login', { replace: true });
            return;
        }
    }, [user?.id, navigate]);

    // Don't render if user is not authenticated
    if (!user?.id) {
        return null;
    }

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [stepComplete, setStepComplete] = useState<Record<number, boolean>>({});
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showStepComplete, setShowStepComplete] = useState(false);
    const [showSuccessTransition, setShowSuccessTransition] = useState(false);
    const [generatedRecipeData, setGeneratedRecipeData] = useState<{ recipe_id: string; recipe: any } | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Section states - Make My Feast is open by default
    const [isMakeFeastOpen, setIsMakeFeastOpen] = useState(true);
    const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);

    // Optimize states
    const [optimizeLoading, setOptimizeLoading] = useState(false);
    const [optimizedRecipe, setOptimizedRecipe] = useState<any | null>(null);
    const [optimizedRecipeRaw, setOptimizedRecipeRaw] = useState<any | null>(null); // Store raw data for saving
    const [showOptimizedResult, setShowOptimizedResult] = useState(false);
    const [savingOptimizedRecipe, setSavingOptimizedRecipe] = useState(false);
    const [originalOptimizeData, setOriginalOptimizeData] = useState<{ recipeName: string, recipeDescription: string } | null>(null);

    // Recent meals states - now using Redux
    const dispatch = useAppDispatch();
    const recentMeals = useAppSelector(selectRecentMeals);
    const recentMealsMeta = useAppSelector(selectRecentMealsMeta);
    const [isRecentMealsOpen, setIsRecentMealsOpen] = useState(false);

    // Mode state: "create" (default) or "quick"
    const [mode, setMode] = useState<'create' | 'quick'>('create');

    // Quick generate data (only description, not saved to localStorage)
    const [quickData, setQuickData] = useState<{ description: string }>({
        description: '',
    });

    const [formData, setFormData] = useState<FormData>({
        mealName: '',
        description: '',
        servingSize: '1',
        mealType: '',
        flavorControls: {},
        timeConstraints: '',
        calorieRange: '',
        proteinTargetPerServing: '',
    });

    // Set page title
    useEffect(() => {
        document.title = 'Feast Studio | LeanFeast AI';
    }, []);

    // Fetch recent meals on mount if not loaded
    useEffect(() => {
        if (user?.id && !recentMealsMeta.loaded && !recentMealsMeta.isLoading) {
            dispatch(fetchRecentMeals({ userId: user.id, page: 1 }));
        }
    }, [user?.id, recentMealsMeta.loaded, recentMealsMeta.isLoading, dispatch]);

    // Helper function to format recipe data for optimize form
    const formatRecipeForOptimize = (recipe: any): { recipeName: string; recipeDescription: string } => {
        const recipeName = recipe.title || recipe.name || '';

        // Format ingredients
        let ingredientsText = '';
        if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
            const ingredientsList = recipe.ingredients.map((ing: any) => {
                if (typeof ing === 'string') {
                    return `- ${ing}`;
                } else if (ing && typeof ing === 'object') {
                    // Handle object format: {name, quantity, unit}
                    const quantity = ing.quantity || '';
                    const unit = ing.unit || '';
                    const name = ing.name || '';
                    if (unit) {
                        return `- ${quantity} ${unit} ${name}`.trim();
                    } else {
                        return `- ${quantity} ${name}`.trim();
                    }
                }
                return '';
            }).filter((item: string) => item.length > 0);
            ingredientsText = ingredientsList.join('\n');
        }

        // Format steps
        let stepsText = '';
        if (recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0) {
            const stepsList = recipe.steps.map((step: any, index: number) => {
                if (typeof step === 'string') {
                    return `${index + 1}. ${step}`;
                } else if (step && typeof step === 'object') {
                    // Handle object format: {step_number, instruction, step_type}
                    const stepNumber = step.step_number || index + 1;
                    const instruction = step.instruction || step.text || '';
                    return `${stepNumber}. ${instruction}`;
                }
                return '';
            }).filter((item: string) => item.length > 0);
            stepsText = stepsList.join('\n');
        }

        // Build formatted description with description, ingredients, and steps
        const description = recipe.description || '';

        let recipeDescription = '';

        // Add description if available
        if (description) {
            recipeDescription = description;
        }

        // Add ingredients list
        if (ingredientsText) {
            if (recipeDescription) {
                recipeDescription += '\n\n';
            }
            recipeDescription += `Ingredients:\n${ingredientsText}`;
        }

        // Add steps/instructions
        if (stepsText) {
            if (recipeDescription) {
                recipeDescription += '\n\n';
            }
            recipeDescription += `Instructions:\n${stepsText}`;
        }

        return {
            recipeName,
            recipeDescription,
        };
    };

    // Handle optimize recipe data from Profile page
    useEffect(() => {
        const state = location.state as any;
        if (state?.optimizeRecipeData && state?.mode === 'optimize') {
            const recipe = state.optimizeRecipeData;
            const formattedData = formatRecipeForOptimize(recipe);

            // Set the optimize data
            setOriginalOptimizeData(formattedData);

            // Open optimize section and close make feast section
            setIsOptimizeOpen(true);
            setIsMakeFeastOpen(false);

            // Clear location state to prevent re-processing on re-renders
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Load from localStorage on mount (only for create mode)
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData({
                    mealName: parsed.mealName || '',
                    description: parsed.description || '',
                    servingSize: parsed.servingSize || '1',
                    mealType: parsed.mealType || '',
                    flavorControls: parsed.flavorControls || {},
                    timeConstraints: parsed.timeConstraints || '',
                    calorieRange: parsed.calorieRange || '',
                    proteinTargetPerServing: parsed.proteinTargetPerServing || '',
                });
                if (parsed.mealName || parsed.description || parsed.mealType) {
                    setIsMakeFeastOpen(true);
                    setMode('create'); // Ensure mode is create when loading saved data
                }
            } catch (err) {
                console.error('Failed to load saved form data:', err);
            }
        }
    }, []);

    // Save to localStorage on formData change (debounced) - only in create mode
    useEffect(() => {
        // Only save to localStorage when in create mode
        if (mode !== 'create') {
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        }, 300);
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [formData, mode]);

    // Set smart defaults when meal type changes
    // Use a ref to track the previous mealType to avoid unnecessary updates
    const prevMealTypeRef = useRef<string>('');

    useEffect(() => {
        // Only run if mealType actually changed and is not empty
        if (formData.mealType &&
            formData.mealType !== prevMealTypeRef.current &&
            flavorControls[formData.mealType as keyof typeof flavorControls]) {

            prevMealTypeRef.current = formData.mealType;
            const fields = flavorControls[formData.mealType as keyof typeof flavorControls].fields;

            setFormData(prev => {
                // Only update if flavorControls don't already have the required fields
                const hasRequiredFields = prev.flavorControls?.cookingSkillLevel;
                if (hasRequiredFields && prev.flavorControls?.flavor !== undefined) {
                    // Already initialized, don't overwrite
                    return prev;
                }

                const defaults: Record<string, string> = {};

                Object.entries(fields).forEach(([fieldName, options]) => {
                    if (fieldName === 'flavor') {
                        // Preserve existing flavor selection if it's valid, otherwise don't set it (optional)
                        const existingFlavor = prev.flavorControls?.flavor;
                        if (existingFlavor && flavorOptions.includes(existingFlavor)) {
                            defaults[fieldName] = existingFlavor;
                        }
                        // If no existing flavor, don't set a default (field is optional)
                    } else {
                        // For required fields like cookingSkillLevel, set default only if not already set
                        if (!prev.flavorControls?.[fieldName]) {
                            const defaultValue = getSmartDefault(fieldName, options);
                            if (defaultValue) {
                                defaults[fieldName] = defaultValue;
                            }
                        } else {
                            // Preserve existing value
                            defaults[fieldName] = prev.flavorControls[fieldName];
                        }
                    }
                });

                // Only update if there are new defaults to set
                if (Object.keys(defaults).length > 0) {
                    return {
                        ...prev,
                        flavorControls: {
                            ...prev.flavorControls,
                            ...defaults
                        }
                    };
                }
                return prev;
            });
        } else if (!formData.mealType) {
            // Reset ref when mealType is cleared
            prevMealTypeRef.current = '';
        }
    }, [formData.mealType]);

    const validateField = (name: keyof FormData, value: string | string[] | Record<string, string>): string | undefined => {
        switch (name) {
            case 'mealName':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    return 'Please enter a meal name';
                }
                if (typeof value === 'string' && value.trim().length < 2) {
                    return 'Meal name must be at least 2 characters';
                }
                break;
            case 'description':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    return 'Please enter a description';
                }
                if (typeof value === 'string' && value.trim().length < 10) {
                    return 'Description must be at least 10 characters';
                }
                break;
            case 'servingSize':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    return 'Please enter serving size';
                }
                const servingNum = typeof value === 'string' ? parseInt(value, 10) : 0;
                if (isNaN(servingNum) || servingNum < 1 || servingNum > 50) {
                    return 'Serving size must be between 1 and 50';
                }
                break;
            case 'mealType':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    return 'Please select a meal type';
                }
                break;
        }
        return undefined;
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return !!(formData.mealName.trim() &&
                    formData.description.trim().length >= 10 &&
                    formData.servingSize);
            case 2:
                // Only require mealType and cookingSkillLevel (flavor is optional)
                return !!(formData.mealType &&
                    formData.flavorControls &&
                    formData.flavorControls.cookingSkillLevel);
            case 3:
                // Optional step, always valid
                return true;
            default:
                return true;
        }
    };

    const handleBlur = (fieldName: keyof FormData) => {
        setTouched((prev) => ({ ...prev, [fieldName]: true }));
        const value = formData[fieldName];
        const error = validateField(fieldName, value);
        setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
    };

    const handleChange = (fieldName: keyof FormData, value: string | Record<string, string>) => {
        setFormData((prev) => ({ ...prev, [fieldName]: value }));

        if (touched[fieldName]) {
            const error = validateField(fieldName, value);
            setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
        }
    };

    const handleFlavorControlChange = (fieldName: string, value: string) => {
        setFormData((prev) => {
            // For optional flavor field, allow toggling (deselecting)
            if (fieldName === 'flavor' && prev.flavorControls[fieldName] === value) {
                const newControls = { ...prev.flavorControls };
                delete newControls[fieldName];
                return {
                    ...prev,
                    flavorControls: newControls
                };
            }
            // For required fields or new selection, set the value
            return {
                ...prev,
                flavorControls: {
                    ...prev.flavorControls,
                    [fieldName]: value
                }
            };
        });
    };

    const nextStep = async () => {
        if (!validateStep(currentStep)) {
            console.warn('[FeastStudio] Step validation failed', {
                step: currentStep,
                formData,
            });
            // Mark fields as touched to show errors
            if (currentStep === 1) {
                handleBlur('mealName');
                handleBlur('description');
                handleBlur('servingSize');
            } else if (currentStep === 2) {
                handleBlur('mealType');
            }
            return;
        }

        // Show step complete animation
        setShowStepComplete(true);
        setStepComplete(prev => ({ ...prev, [currentStep]: true }));

        // Transition animation
        setIsTransitioning(true);

        // Shimmer delay
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsTransitioning(false);
        setShowStepComplete(false);

        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const goToStep = (step: number) => {
        setCurrentStep(step);
    };

    // Helper function to get emoji based on meal type or flavor
    const getMealEmoji = (mealType: string): string => {
        const emojiMap: Record<string, string> = {
            'Breakfast': '🥞',
            'Lunch': '🍱',
            'Dinner': '🍛',
            'Snack': '🍪',
            'Post-Workout': '💪',
            'Pre-Workout': '⚡',
            'Dessert': '🍰',
            'Appetizer': '🥗',
        };
        return emojiMap[mealType] || '🍽️';
    };

    const getFlavorEmoji = (flavor: string): string => {
        if (flavor.includes('Spicy') || flavor.includes('Bold')) return '🌶️';
        if (flavor.includes('Sweet') || flavor.includes('Comforting')) return '🍯';
        if (flavor.includes('High Protein') || flavor.includes('Protein')) return '💪';
        if (flavor.includes('Fresh') || flavor.includes('Light')) return '🌿';
        if (flavor.includes('Creamy') || flavor.includes('Rich')) return '🥛';
        if (flavor.includes('Savory') || flavor.includes('Hearty')) return '🍖';
        return '✨';
    };

    // Memoize generateSummary to prevent unnecessary recalculations and re-renders
    const summaryText = useMemo(() => {
        // Quick mode summary
        if (mode === 'quick') {
            if (quickData.description && quickData.description.trim().length >= 10) {
                return `Noted! 🍛 I'll create a quick meal based on your description. Let's make it perfect!`;
            }
            return "Describe what you'd like me to cook and I'll generate a recipe with smart defaults! 🍽️";
        }

        // Create mode summary
        const hasMealName = formData.mealName && formData.mealName.trim() !== '';
        const hasServingSize = formData.servingSize && formData.servingSize.trim() !== '';
        const hasMealType = formData.mealType && formData.mealType.trim() !== '';
        const flavor = formData.flavorControls?.flavor || '';
        const hasFlavor = flavor && flavor.trim() !== '';

        // If we have all required fields, show the full summary
        if (hasMealName && hasServingSize && hasMealType) {
            const serving = parseInt(formData.servingSize, 10);
            const servingText = serving === 1 ? '1 person' : `${serving} people`;
            const mealEmoji = getMealEmoji(formData.mealType);
            const flavorEmoji = hasFlavor ? ` ${getFlavorEmoji(flavor)}` : '';

            if (hasFlavor && (flavor.includes('Spicy') || flavor.includes('High Protein'))) {
                return `Noted! ${mealEmoji} ${formData.mealName} for ${servingText} coming up.${flavorEmoji} Nice choice!`;
            }
            return `Noted! ${mealEmoji} ${formData.mealName} for ${servingText}, for ${formData.mealType.toLowerCase()}.${flavorEmoji} Let's make it perfect!`;
        }

        // If we have partial information, show what we have
        if (hasMealName) {
            if (hasServingSize) {
                const serving = parseInt(formData.servingSize, 10);
                const servingText = serving === 1 ? '1 person' : `${serving} people`;
                const mealEmoji = hasMealType ? getMealEmoji(formData.mealType) : '🍛';
                return `Got it — ${formData.mealName} for ${servingText} ${mealEmoji} Let's make it perfect!`;
            }
            return `Got it — ${formData.mealName} 🍽️ Let's make it perfect!`;
        }

        // Default message when no information is available yet
        return "Tell me what you're craving and I'll create the recipe for you.";
    }, [mode, quickData.description, formData.mealName, formData.servingSize, formData.mealType, formData.flavorControls]);

    const handleSubmit = async () => {
        setError(null);
        setLoading(true);

        let submitData: any;

        if (mode === 'quick') {
            // Quick mode: only send description, all other fields are null
            if (!quickData.description || quickData.description.trim().length < 10) {
                setError('Please enter at least 10 characters for the description.');
                setLoading(false);
                return;
            }

            submitData = {
                meal_name: null,
                description: quickData.description.trim(),
                serving_size: null,
                meal_type: null,
                flavor_controls: null,
                cooking_skill_level: null,
                time_constraints: null,
                calorie_range: null,
                protein_target_per_serving: null,
            };
        } else {
            // Create mode: validate full form
            const requiredFields: Array<keyof FormData> = ['mealName', 'description', 'servingSize', 'mealType'];
            const newTouched: Record<string, boolean> = {};
            const newErrors: FieldErrors = {};

            requiredFields.forEach((field) => {
                newTouched[field] = true;
                const error = validateField(field, formData[field]);
                if (error) {
                    if (field === 'mealName') newErrors.mealName = error;
                    else if (field === 'description') newErrors.description = error;
                    else if (field === 'servingSize') newErrors.servingSize = error;
                    else if (field === 'mealType') newErrors.mealType = error;
                }
            });

            setTouched(newTouched);
            setFieldErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                setLoading(false);
                setCurrentStep(1);
                return;
            }

            // Validate calorie range format if provided
            if (formData.calorieRange.trim()) {
                const calorieMatch = formData.calorieRange.match(/^(\d+)\s*-\s*(\d+)$/);
                if (!calorieMatch) {
                    setFieldErrors((prev) => ({ ...prev, calorieRange: 'Please enter calorie range in format: 200-500' }));
                    setLoading(false);
                    setCurrentStep(3);
                    return;
                }
                const minCal = parseInt(calorieMatch[1], 10);
                const maxCal = parseInt(calorieMatch[2], 10);
                if (minCal >= maxCal) {
                    setFieldErrors((prev) => ({ ...prev, calorieRange: 'Minimum calories must be less than maximum' }));
                    setLoading(false);
                    setCurrentStep(3);
                    return;
                }
            }

            // Separate cookingSkillLevel from flavor_controls
            const { cookingSkillLevel, ...flavorControlsOnly } = formData.flavorControls;
            const flavorOnly = flavorControlsOnly.flavor && flavorControlsOnly.flavor.trim() !== ''
                ? { flavor: flavorControlsOnly.flavor }
                : {};

            submitData = {
                meal_name: formData.mealName.trim(),
                description: formData.description.trim(),
                serving_size: parseInt(formData.servingSize, 10),
                meal_type: formData.mealType || null,
                flavor_controls: Object.keys(flavorOnly).length > 0 ? flavorOnly : null,
                cooking_skill_level: cookingSkillLevel || null,
                time_constraints: formData.timeConstraints.trim() || null,
                calorie_range: formData.calorieRange.trim() || null,
                protein_target_per_serving: formData.proteinTargetPerServing.trim()
                    ? parseFloat(formData.proteinTargetPerServing)
                    : null,
            };
        }

        try {
            // Get JWT token from Supabase
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error('Not authenticated. Please log in.');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // Call recipe generation API
            const response = await fetch(`${backendUrl}/api/recipes/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                console.error('Recipe generation failed:', errorData);
                throw new Error(errorData.detail || `Failed to generate recipe: ${response.statusText}`);
            }

            const result = await response.json();

            // Store recipe_id in localStorage as context for MakeMyFeastDetails and FeastGuide pages
            // This will be cleared when user leaves those pages
            if (result.recipe_id) {
                localStorage.setItem('current_recipe_id', result.recipe_id);
            }

            // Clear form localStorage
            localStorage.removeItem(STORAGE_KEY);

            // Store recipe data and show success transition
            setGeneratedRecipeData({
                recipe_id: result.recipe_id,
                recipe: result.recipe,
            });
            setLoading(false);
            setShowSuccessTransition(true);
        } catch (err) {
            console.error('Failed to submit form:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit form. Please try again.';
            setError(errorMessage);
            setLoading(false);
            // Form data is preserved, user can retry
        }
    };

    const hasSavedData = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return !!(parsed.mealName || parsed.description || parsed.mealType);
            } catch {
                return false;
            }
        }
        return false;
    };

    const handleQuickGenerate = () => {
        // Set mode to quick and clear formData
        setMode('quick');
        setQuickData({ description: '' });
        setFormData({
            mealName: '',
            description: '',
            servingSize: '1',
            mealType: '',
            flavorControls: {},
            timeConstraints: '',
            calorieRange: '',
            proteinTargetPerServing: '',
        });
        setCurrentStep(1);
        setError(null);
        setIsMakeFeastOpen(true);

        // Scroll to form section
        setTimeout(() => {
            document.getElementById('make-feast-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleResumeFeast = () => {
        // Load saved data from localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData({
                    mealName: parsed.mealName || '',
                    description: parsed.description || '',
                    servingSize: parsed.servingSize || '1',
                    mealType: parsed.mealType || '',
                    flavorControls: parsed.flavorControls || {},
                    timeConstraints: parsed.timeConstraints || '',
                    calorieRange: parsed.calorieRange || '',
                    proteinTargetPerServing: parsed.proteinTargetPerServing || '',
                });
                // Determine which step to show based on saved data
                if (parsed.mealName && parsed.description && parsed.servingSize) {
                    if (parsed.mealType && parsed.flavorControls?.cookingSkillLevel) {
                        // Step 2 or 3 completed
                        setCurrentStep(3);
                    } else {
                        // Step 1 completed
                        setCurrentStep(2);
                    }
                } else {
                    setCurrentStep(1);
                }
            } catch (err) {
                console.error('Failed to load saved form data:', err);
                // Fall back to starting new feast
                handleStartFeast();
                return;
            }
        }
        setMode('create');
        setQuickData({ description: '' });
        setError(null);
        setIsMakeFeastOpen(true);

        // Scroll to form section
        setTimeout(() => {
            document.getElementById('make-feast-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleStartFeast = () => {
        // Set mode to create, reset formData, and clear localStorage
        setMode('create');
        setQuickData({ description: '' });
        localStorage.removeItem(STORAGE_KEY);
        setFormData({
            mealName: '',
            description: '',
            servingSize: '1',
            mealType: '',
            flavorControls: {},
            timeConstraints: '',
            calorieRange: '',
            proteinTargetPerServing: '',
        });
        setCurrentStep(1);
        setError(null);
        setIsMakeFeastOpen(true);

        // Scroll to form section
        setTimeout(() => {
            document.getElementById('make-feast-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleResetForm = () => {
        // Clear all form data and state
        localStorage.removeItem(STORAGE_KEY);
        setFormData({
            mealName: '',
            description: '',
            servingSize: '1',
            mealType: '',
            flavorControls: {},
            timeConstraints: '',
            calorieRange: '',
            proteinTargetPerServing: '',
        });
        setCurrentStep(1);
        setError(null);
        setFieldErrors({});
        setTouched({});
        setStepComplete({});
        setShowStepComplete(false);
        setIsTransitioning(false);
        // Reset the mealType ref so defaults can be set again if needed
        prevMealTypeRef.current = '';
    };

    const handleOptimizeSubmit = async (data: OptimizeFormData) => {
        // Store original data for pre-filling on retry
        setOriginalOptimizeData({
            recipeName: data.recipeName,
            recipeDescription: data.recipeDescription
        });

        setOptimizeLoading(true);
        setError(null);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('Authentication required. Please log in.');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const requestBody = {
                recipe_description: data.recipeDescription,
                optimization_goal: data.optimizationGoal,
                additional_notes: data.additionalNotes || null,
                recipe_name: data.recipeName || null,
            };

            const response = await fetch(`${backendUrl}/api/recipes/optimize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || `Failed to optimize recipe: ${response.statusText}`);
            }

            const result = await response.json();

            // Transform backend response to match OptimizedRecipe interface
            const optimizedRecipe = {
                original: {
                    name: result.original.name,
                    ingredients: result.original.ingredients,
                    instructions: result.original.instructions,
                    nutrition: result.original.nutrition || {},
                },
                optimized: {
                    name: result.optimized.name,
                    ingredients: result.optimized.ingredients,
                    instructions: result.optimized.instructions,
                    image_base64: result.optimized.image_base64,
                    nutrition: result.optimized.nutrition || {},
                },
                changes: result.changes || [],
            };

            // Store raw recipe data for saving
            if (result.optimized._raw) {
                setOptimizedRecipeRaw({
                    ...result.optimized._raw,
                    title: result.optimized.name,
                    description: result.optimized.description || result.optimized.name,
                    image_base64: result.optimized.image_base64,
                    nutrition: result.optimized.nutrition || {},
                });
            }

            setOptimizedRecipe(optimizedRecipe);
            setShowOptimizedResult(true);
            setOptimizeLoading(false);
        } catch (err) {
            console.error('[FeastStudio] Error optimizing recipe:', err);
            setError(err instanceof Error ? err.message : 'Failed to optimize recipe. Please try again.');
            setOptimizeLoading(false);
        }
    };

    const handleUseOptimizedRecipe = async () => {
        if (!optimizedRecipeRaw || !user) {
            setError('Unable to save recipe. Please try again.');
            return;
        }

        setSavingOptimizedRecipe(true);
        setError(null);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('Authentication required. Please log in.');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const requestBody = {
                title: optimizedRecipeRaw.title,
                description: optimizedRecipeRaw.description,
                serving_size: optimizedRecipeRaw.serving_size || 1,
                meal_type: null, // Can be extracted from tags if needed
                ingredients: optimizedRecipeRaw.ingredients,
                steps: optimizedRecipeRaw.steps,
                prep_time: optimizedRecipeRaw.prep_time || 0,
                cook_time: optimizedRecipeRaw.cook_time || 0,
                tags: optimizedRecipeRaw.tags || [],
                nutrition: optimizedRecipeRaw.nutrition || {},
                image_base64: optimizedRecipeRaw.image_base64 || null,
                optimization_metadata: {
                    is_optimized: true,
                },
            };

            const response = await fetch(`${backendUrl}/api/recipes/optimize/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || `Failed to save recipe: ${response.statusText}`);
            }

            const result = await response.json();

            // Navigate to recipe details page
            navigate('/make-my-feast-details', {
                state: {
                    recipe_id: result.recipe_id,
                    recipe: result.recipe,
                },
            });
        } catch (err) {
            console.error('[FeastStudio] Error saving optimized recipe:', err);
            setError(err instanceof Error ? err.message : 'Failed to save recipe. Please try again.');
            setSavingOptimizedRecipe(false);
        }
    };

    const handleTryAnotherOptimization = () => {
        setShowOptimizedResult(false);
        setOptimizedRecipe(null);
        setOptimizedRecipeRaw(null);
        setIsOptimizeOpen(true);
        // Form will be pre-filled with originalOptimizeData via props
    };

    const handleResetOptimize = () => {
        setOriginalOptimizeData(null);
        setOptimizedRecipe(null);
        setOptimizedRecipeRaw(null);
        setShowOptimizedResult(false);
        setOptimizeLoading(false);
    };

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Chef';

    const isFieldValid = (fieldName: keyof FormData): boolean => {
        if (!touched[fieldName]) return false;
        return !(fieldErrors[fieldName as keyof FieldErrors]);
    };

    const handleSuccessTransitionComplete = () => {
        if (generatedRecipeData) {
            // Navigate to details page with recipe_id
            navigate('/make-my-feast-details', {
                state: {
                    recipe_id: generatedRecipeData.recipe_id,
                    recipe: generatedRecipeData.recipe,
                },
            });

            // Reset mode, clear quickData, and reset formData after navigation
            setMode('create');
            setQuickData({ description: '' });
            setFormData({
                mealName: '',
                description: '',
                servingSize: '1',
                mealType: '',
                flavorControls: {},
                timeConstraints: '',
                calorieRange: '',
                proteinTargetPerServing: '',
            });
            setCurrentStep(1);
            setError(null);
            setShowSuccessTransition(false);
            setGeneratedRecipeData(null);
        }
    };

    return (
        <div className="min-h-screen relative"
            style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
            }}
        >
            {/* Floating Food Icons Background */}
            <FloatingFoodIcons />

            <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12 relative z-10">
                {/* Hero Section */}
                <FeastStudioHero
                    userName={userName}
                    hasSavedData={hasSavedData()}
                    onStartFeast={hasSavedData() ? handleResumeFeast : handleStartFeast}
                    onQuickGenerate={handleQuickGenerate}
                />

                {/* Section 1: Make My Feast */}
                <CollapsibleSection
                    id="make-feast-section"
                    title="Make My Feast"
                    icon="🍳"
                    isOpen={isMakeFeastOpen}
                    onToggle={() => setIsMakeFeastOpen(!isMakeFeastOpen)}
                >
                    <div className="space-y-4 sm:space-y-6 md:space-y-8">
                        {/* Progress Indicator - Only show in create mode */}
                        {mode === 'create' && (
                            <ProgressIndicator
                                currentStep={currentStep}
                                steps={steps}
                                stepComplete={stepComplete}
                                onStepClick={goToStep}
                                onReset={handleResetForm}
                            />
                        )}

                        {/* Quick Mode: Simple description input */}
                        {mode === 'quick' ? (
                            <QuickGenerateForm
                                description={quickData.description}
                                onDescriptionChange={(value) => setQuickData({ description: value })}
                                onSubmit={handleSubmit}
                                loading={loading}
                                error={error}
                            />
                        ) : (
                            /* Create Mode: Full multi-step form */
                            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                                {/* Main Form */}
                                <div className="md:col-span-2 order-2 md:order-1">
                                    {error && (
                                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl text-red-600 bg-red-50 border border-red-200">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                                <p className="font-medium text-xs sm:text-sm">{error}</p>
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={loading}
                                                    className="w-full sm:w-auto ml-0 sm:ml-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                                >
                                                    {loading ? 'Retrying...' : 'Retry'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {showStepComplete && (
                                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-green-50 border border-green-200 animate-pulse">
                                            <p className="text-green-700 font-semibold text-center text-sm sm:text-base">
                                                ✓ Step {currentStep} Complete!
                                            </p>
                                        </div>
                                    )}

                                    {isTransitioning && (
                                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-primary/10 border border-primary/20">
                                            <p className="text-primary font-semibold text-center animate-pulse text-sm sm:text-base">
                                                👨‍🍳 Chef thinking...
                                            </p>
                                        </div>
                                    )}

                                    {/* Step 1: Core Information */}
                                    {currentStep === 1 && (
                                        <Step1CoreInformation
                                            formData={formData}
                                            fieldErrors={fieldErrors}
                                            touched={touched}
                                            onFieldChange={handleChange}
                                            onFieldBlur={handleBlur}
                                            isFieldValid={isFieldValid}
                                            onNext={nextStep}
                                            canProceed={validateStep(1)}
                                        />
                                    )}

                                    {/* Step 2: Personalization */}
                                    {currentStep === 2 && (
                                        <Step2Personalization
                                            formData={formData}
                                            fieldErrors={fieldErrors}
                                            touched={touched}
                                            onFieldChange={handleChange}
                                            onFieldBlur={handleBlur}
                                            onFlavorControlChange={handleFlavorControlChange}
                                            onPrevious={prevStep}
                                            onNext={nextStep}
                                            canProceed={validateStep(2)}
                                        />
                                    )}

                                    {/* Step 3: Additional Preferences */}
                                    {currentStep === 3 && (
                                        <Step3AdditionalPreferences
                                            formData={formData}
                                            fieldErrors={fieldErrors}
                                            onFieldChange={handleChange}
                                            onFieldBlur={handleBlur}
                                            onPrevious={prevStep}
                                            onNext={nextStep}
                                        />
                                    )}

                                    {/* Step 4: Preview & Confirm */}
                                    {currentStep === 4 && (
                                        <Step4PreviewConfirm
                                            formData={formData}
                                            loading={loading}
                                            onPrevious={prevStep}
                                            onSubmit={handleSubmit}
                                        />
                                    )}
                                </div>

                                {/* Live Summary Panel - Only show in create mode */}
                                <div className="hidden md:block order-1 md:order-2">
                                    <CookingAssistantPanel summaryText={summaryText} />
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* Section 2: Optimize My Meal */}
                <CollapsibleSection
                    id="optimize-section"
                    title="Got a recipe already? Let's optimize it"
                    icon="🔧"
                    isOpen={isOptimizeOpen}
                    onToggle={() => {
                        setIsOptimizeOpen(!isOptimizeOpen);
                        if (showOptimizedResult) {
                            setShowOptimizedResult(false);
                            setOptimizedRecipe(null);
                        }
                    }}
                >
                    {!showOptimizedResult ? (
                        <OptimizeMealForm
                            onSubmit={handleOptimizeSubmit}
                            loading={optimizeLoading}
                            initialRecipeName={originalOptimizeData?.recipeName}
                            initialRecipeDescription={originalOptimizeData?.recipeDescription}
                            onReset={handleResetOptimize}
                        />
                    ) : optimizedRecipe ? (
                        <OptimizedRecipeView
                            recipe={optimizedRecipe}
                            onUseRecipe={handleUseOptimizedRecipe}
                            onTryAnother={handleTryAnotherOptimization}
                            isSaving={savingOptimizedRecipe}
                        />
                    ) : null}
                </CollapsibleSection>

                {/* Section 3: Recent Meals - Only show if user is logged in */}
                {user?.id && (
                    <CollapsibleSection
                        id="recent-meals-section"
                        title="Your Recent Cooked Meals"
                        icon="📚"
                        isOpen={isRecentMealsOpen}
                        onToggle={() => setIsRecentMealsOpen(!isRecentMealsOpen)}
                    >
                        <RecentMeals meals={recentMeals} loading={recentMealsMeta.isLoading} />
                    </CollapsibleSection>
                )}
            </div>

            {/* Recipe Generation Spinner */}
            {(loading || optimizeLoading) && <RecipeGenerationSpinner />}

            {/* Success Transition */}
            {showSuccessTransition && (
                <SuccessTransition onComplete={handleSuccessTransitionComplete} />
            )}
        </div>
    );
}