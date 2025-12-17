import { useRef, useState } from "react";

interface ImageUploadProps {
    onImageSelect: (file: File | null) => void;
    preview?: string | null;
    label?: string;
}

export default function ImageUpload({ onImageSelect, preview, label = "Upload Image" }: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
                onImageSelect(file);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageSelect(e.target.files[0]);
        }
    };

    const handleRemove = () => {
        onImageSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-42 mb-2">
                {label}
            </label>
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActive
                        ? "border-primary bg-primary/5"
                        : preview
                            ? "border-neutral-200"
                            : "border-neutral-300 hover:border-primary/50"
                    }`}
            >
                {preview ? (
                    <div className="relative bg-neutral-50 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-w-full max-h-64 object-contain rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            aria-label="Remove image"
                        >
                            ×
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-neutral-61 text-sm">
                            Drag & drop an image here, or{" "}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-primary hover:underline font-semibold"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-xs text-neutral-400">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                    aria-label="Upload image"
                />
            </div>
        </div>
    );
}