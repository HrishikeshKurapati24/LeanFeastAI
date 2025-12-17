import { useNavigate } from 'react-router-dom';

interface Activity {
    id: string;
    action_type: string;
    recipe_id?: string;
    recipe_title?: string;
    action_timestamp?: string | null | undefined;
    timestamp?: string;
    metadata?: Record<string, any>;
}

interface RecentActivityProps {
    activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
    const navigate = useNavigate();

    const formatActionType = (actionType: string): string => {
        const actionMap: Record<string, string> = {
            create_recipe: 'Created',
            share_recipe: 'Shared',
            optimize_recipe: 'Optimized',
            like_recipe: 'Liked',
            unlike_recipe: 'Unliked',
            cook_recipe: 'Cooked',
            view_recipe: 'Viewed',
            save_recipe: 'Saved',
            unsave_recipe: 'Unsaved',
            'step-by-step': 'Cook',
            step_by_step: 'Cook',
            Comment: 'Comment on',
            comment: 'Comment on',
        };
        return actionMap[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const getRelativeTime = (action_timestamp: string | null | undefined): string => {
        if (!action_timestamp) return 'Unknown time';

        try {
            const now = new Date();
            let activityDate: Date;

            if (typeof action_timestamp === 'string') {
                // Try multiple timestamp formats
                // Format 1: ISO string with 'Z' (UTC)
                if (action_timestamp.includes('Z')) {
                    activityDate = new Date(action_timestamp);
                }
                // Format 2: ISO string with timezone offset (e.g., +00:00)
                else if (action_timestamp.match(/[+-]\d{2}:\d{2}$/)) {
                    activityDate = new Date(action_timestamp);
                }
                // Format 3: Unix timestamp (milliseconds)
                else if (/^\d+$/.test(action_timestamp) && action_timestamp.length > 10) {
                    activityDate = new Date(parseInt(action_timestamp, 10));
                }
                // Format 4: Unix timestamp (seconds) - convert to milliseconds
                else if (/^\d+$/.test(action_timestamp) && action_timestamp.length <= 10) {
                    activityDate = new Date(parseInt(action_timestamp, 10) * 1000);
                }
                // Format 5: Standard ISO string without Z
                else {
                    // Try parsing as-is first
                    activityDate = new Date(action_timestamp);
                    // If that fails, try adding Z
                    if (isNaN(activityDate.getTime())) {
                        activityDate = new Date(action_timestamp + 'Z');
                    }
                }
            } else {
                activityDate = new Date(action_timestamp);
            }

            // Check if date is valid
            if (isNaN(activityDate.getTime())) {
                console.warn('[RecentActivity] Invalid timestamp:', action_timestamp);
                // Try one more time with a different approach
                const fallbackDate = new Date(action_timestamp.toString());
                if (!isNaN(fallbackDate.getTime())) {
                    activityDate = fallbackDate;
                } else {
                    return 'Unknown time';
                }
            }

            const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);

            // Handle negative differences (future dates)
            if (diffInSeconds < 0) {
                return 'just now';
            }

            if (diffInSeconds < 60) {
                return 'just now';
            } else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 604800) {
                const days = Math.floor(diffInSeconds / 86400);
                return `${days} day${days > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 2592000) {
                const weeks = Math.floor(diffInSeconds / 604800);
                return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            } else {
                const months = Math.floor(diffInSeconds / 2592000);
                return `${months} month${months > 1 ? 's' : ''} ago`;
            }
        } catch (error) {
            console.error('[RecentActivity] Error parsing timestamp:', error, action_timestamp);
            // Try a fallback: if timestamp looks like a number, try parsing as Unix timestamp
            if (typeof action_timestamp === 'string' && /^\d+$/.test(action_timestamp)) {
                try {
                    const numTimestamp = action_timestamp.length <= 10
                        ? parseInt(action_timestamp, 10) * 1000
                        : parseInt(action_timestamp, 10);
                    const fallbackDate = new Date(numTimestamp);
                    if (!isNaN(fallbackDate.getTime())) {
                        const now = new Date();
                        const diffInSeconds = Math.floor((now.getTime() - fallbackDate.getTime()) / 1000);
                        if (diffInSeconds >= 0 && diffInSeconds < 60) return 'just now';
                        if (diffInSeconds < 3600) {
                            const minutes = Math.floor(diffInSeconds / 60);
                            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                        }
                        if (diffInSeconds < 86400) {
                            const hours = Math.floor(diffInSeconds / 3600);
                            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                        }
                        const days = Math.floor(diffInSeconds / 86400);
                        return `${days} day${days > 1 ? 's' : ''} ago`;
                    }
                } catch (fallbackError) {
                    console.error('[RecentActivity] Fallback timestamp parsing also failed:', fallbackError);
                }
            }
            return 'Unknown time';
        }
    };

    const getActionIcon = (actionType: string): string => {
        const iconMap: Record<string, string> = {
            create_recipe: '🍳',
            share_recipe: '🌍',
            optimize_recipe: '⚡',
            like_recipe: '❤️',
            unlike_recipe: '💔',
            cook_recipe: '👨‍🍳',
            view_recipe: '👁️',
            save_recipe: '💾',
            unsave_recipe: '🗑️',
            'Step-by-Step': '🔊',
            step_by_step: '🔊',
            Comment: '💬',
            comment: '💬',
        };
        return iconMap[actionType] || '📝';
    };

    const handleActivityClick = (activity: Activity) => {
        if (activity.recipe_id) {
            navigate(`/recipe/${activity.recipe_id}`);
        }
    };

    if (activities.length === 0) {
        return (
            <div
                className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 sm:mb-4">Recent Activity</h2>
                <div className="text-center py-6 sm:py-8 md:py-12">
                    <div className="text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">🕒</div>
                    <p className="text-sm sm:text-base text-neutral-61 mb-3 sm:mb-4">
                        No recent activity. Start cooking to see your activity timeline!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
            style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
        >
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-5 md:mb-6">Recent Activity</h2>

            <div className="space-y-2 sm:space-y-3 md:space-y-4">
                {activities
                    .filter((activity) => activity.action_type !== 'Progress' && activity.action_type !== 'progress')
                    .map((activity) => (
                        <div
                            key={activity.id}
                            onClick={() => handleActivityClick(activity)}
                            className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg transition-shadow ${activity.recipe_id ? 'cursor-pointer' : ''
                                }`}
                        >
                            <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                <div className="text-xl sm:text-2xl">{getActionIcon(activity.action_type)}</div>
                                <div className="flex-1">
                                    <div className="text-xs sm:text-sm font-semibold text-neutral-42 mb-0.5 sm:mb-1">
                                        {formatActionType(activity.action_type)}
                                        {activity.recipe_title && activity.recipe_id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/recipe/${activity.recipe_id}`);
                                                }}
                                                className="text-primary hover:text-primary-dark transition-colors cursor-pointer"
                                                aria-label={`View recipe: ${activity.recipe_title}`}
                                            >
                                                &quot;{activity.recipe_title}&quot;
                                            </button>
                                        )}
                                        {activity.recipe_title && !activity.recipe_id && (
                                            <span className="text-primary"> &quot;{activity.recipe_title}&quot;</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-neutral-61">
                                        {getRelativeTime(activity.action_timestamp)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}