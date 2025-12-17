import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ShareToCommunityForm from "./ShareToCommunityForm.tsx";
import RecipeSelectionView from "./RecipeSelectionView.tsx";
import RecipePreviewModal from "./RecipePreviewModal.tsx";
import { supabase } from "../../config/supabaseClient";

interface Recipe {
    id: string;
    title: string;
    image_url: string;
    description: string;
    tags: string[];
    prep_time: number;
    cook_time: number;
    serving_size: number;
    nutrition: {
        calories: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    };
    is_public: boolean;
    is_ai_generated?: boolean;
    steps?: RecipeStep[];
}

interface RecipeStep {
    text: string;
    step_type?: "active" | "passive" | "wait";
}

interface ShareMyFeastModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        image: File | null;
        title: string;
        description: string;
        tags: string[];
        isAiGenerated: boolean;
        recipeId?: string;
        steps?: RecipeStep[];
    }) => Promise<void>;
    loading?: boolean;
}

type TabType = "existing" | "new";

export default function ShareMyFeastModal({
    isOpen,
    onClose,
    onSubmit,
    loading = false,
}: ShareMyFeastModalProps) {
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("new");

    // Fetch saved/liked recipes from backend when modal opens
    useEffect(() => {
        if (!(isOpen && activeTab === "existing")) return;

        const controller = new AbortController();

        const fetchSavedLikedRecipes = async () => {
            try {
                setLoadingRecipes(true);

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const user = session.user;
                const token = session.access_token;
                const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

                const res = await fetch(
                    `${backendUrl}/api/users/${user.id}/recipes/saved-liked`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: controller.signal
                    }
                );

                if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

                const data = await res.json();

                // Backend already filtered out community recipes and separated saved/liked
                setSavedRecipes(data.saved_recipes || []);
                setLikedRecipes(data.liked_recipes || []);

            } catch (err: any) {
                if (err.name === "AbortError") return;
                console.error("Fetch error:", err);
            } finally {
                setLoadingRecipes(false);
            }
        };

        fetchSavedLikedRecipes();

        return () => controller.abort();
    }, [isOpen, activeTab]);

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formInitialData, setFormInitialData] = useState<{
        title: string;
        description: string;
        tags: string[];
        imageUrl: string | null;
        recipeId?: string;
        steps?: RecipeStep[];
        isAiGenerated?: boolean;
    } | null>(null);

    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                if (showPreviewModal) {
                    setShowPreviewModal(false);
                    setSelectedRecipe(null);
                } else if (showForm && formInitialData) {
                    setShowForm(false);
                    setFormInitialData(null);
                } else {
                    onClose();
                }
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose, showPreviewModal, showForm, formInitialData]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setActiveTab("new");
            setSelectedRecipe(null);
            setShowPreviewModal(false);
            setShowForm(false);
            setFormInitialData(null);
        }
    }, [isOpen]);

    const handleSubmit = async (data: {
        image: File | null;
        title: string;
        description: string;
        tags: string[];
        isAiGenerated: boolean;
        steps?: RecipeStep[];
    }) => {
        try {
            await onSubmit({
                ...data,
                recipeId: formInitialData?.recipeId,
            });
            setShowSuccess(true);
            // Auto-close modal after 2 seconds
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Failed to submit:", error);
        }
    };

    const handleRecipeSelect = (recipe: Recipe) => {
        setSelectedRecipe(recipe);
        setShowPreviewModal(true);
    };

    const handleEditAndShare = () => {
        if (selectedRecipe) {
            // Convert steps from backend format to form format if they exist
            const formSteps = (selectedRecipe.steps || []).map((step: any) => ({
                text: step.text || step.instruction || "",
                step_type: step.step_type || "active"
            }));

            setFormInitialData({
                title: selectedRecipe.title,
                description: selectedRecipe.description,
                tags: selectedRecipe.tags,
                imageUrl: selectedRecipe.image_url,
                recipeId: selectedRecipe.id,
                steps: formSteps.length > 0 ? formSteps : undefined,
                isAiGenerated: selectedRecipe.is_ai_generated || false,
            });
            setShowPreviewModal(false);
            setShowForm(true);
        }
    };

    const handleBackFromForm = () => {
        setShowForm(false);
        setFormInitialData(null);
        setSelectedRecipe(null);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-3 md:p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="sticky top-0 bg-white border-b border-neutral-200 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-4 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl z-10">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-42">
                                        Share Your Feast
                                    </h2>
                                    <button
                                        onClick={onClose}
                                        className="text-neutral-61 hover:text-neutral-42 text-xl sm:text-2xl font-bold transition-colors"
                                        aria-label="Close modal"
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Tabs */}
                                {!showSuccess && !showForm && (
                                    <div className="border-b border-neutral-200 px-3 sm:px-4 md:px-5 lg:px-6">
                                        <div className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                                            <button
                                                onClick={() => setActiveTab("existing")}
                                                className={`pb-2 px-1.5 sm:pb-2.5 sm:px-2 md:pb-3 font-semibold transition-colors capitalize text-xs sm:text-sm md:text-base ${activeTab === "existing"
                                                    ? "border-b-2 border-primary text-primary"
                                                    : "text-neutral-75 hover:text-primary"
                                                    }`}
                                            >
                                                Share Existing Recipe not in Community Hub
                                            </button>
                                            <button
                                                onClick={() => setActiveTab("new")}
                                                className={`pb-2 px-1.5 sm:pb-2.5 sm:px-2 md:pb-3 font-semibold transition-colors capitalize text-xs sm:text-sm md:text-base ${activeTab === "new"
                                                    ? "border-b-2 border-primary text-primary"
                                                    : "text-neutral-75 hover:text-primary"
                                                    }`}
                                            >
                                                Create New Recipe
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Back button when in form mode */}
                                {showForm && formInitialData && (
                                    <div className="px-3 pt-3 sm:px-4 sm:pt-3.5 md:px-6 md:pt-4">
                                        <button
                                            onClick={handleBackFromForm}
                                            className="flex items-center gap-1.5 sm:gap-2 text-neutral-61 hover:text-neutral-42 transition-colors text-xs sm:text-sm"
                                        >
                                            <span>←</span>
                                            <span>Back to selection</span>
                                        </button>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6">
                                    {showSuccess ? (
                                        <div className="text-center py-6 sm:py-7 md:py-8">
                                            <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-3.5 md:mb-4">🎉</div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-primary mb-1.5 sm:mb-2">
                                                Your feast is live!
                                            </h3>
                                            <p className="text-sm sm:text-base text-neutral-61">
                                                Thank you for sharing with the community
                                            </p>
                                        </div>
                                    ) : showForm && formInitialData ? (
                                        <ShareToCommunityForm
                                            onSubmit={handleSubmit}
                                            loading={loading}
                                            initialTitle={formInitialData.title}
                                            initialDescription={formInitialData.description}
                                            initialTags={formInitialData.tags}
                                            initialImageUrl={formInitialData.imageUrl}
                                            initialSteps={formInitialData.steps}
                                            initialIsAiGenerated={formInitialData.isAiGenerated ?? false}
                                        />
                                    ) : activeTab === "existing" ? (
                                        loadingRecipes ? (
                                            <div className="text-center py-8 sm:py-10 md:py-12">
                                                <div className="text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-3.5 md:mb-4">⏳</div>
                                                <p className="text-sm sm:text-base text-neutral-61">Loading your recipes...</p>
                                            </div>
                                        ) : (
                                            <RecipeSelectionView
                                                savedRecipes={savedRecipes}
                                                likedRecipes={likedRecipes}
                                                onRecipeSelect={handleRecipeSelect}
                                            />
                                        )
                                    ) : (
                                        <ShareToCommunityForm
                                            onSubmit={handleSubmit}
                                            loading={loading}
                                            initialIsAiGenerated={false}
                                        />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Recipe Preview Modal */}
            {selectedRecipe && (
                <RecipePreviewModal
                    recipe={selectedRecipe}
                    isOpen={showPreviewModal}
                    onClose={() => {
                        setShowPreviewModal(false);
                        setSelectedRecipe(null);
                    }}
                    onEditAndShare={handleEditAndShare}
                />
            )}
        </>
    );
}