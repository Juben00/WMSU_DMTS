import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
    size = 'xl',
    className = '',
    text = 'WMSU DocTrack'
}) => {
    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-34 h-34',
        lg: 'w-32 h-32',
        xl: 'w-40 h-40'
    };

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-900/50 z-50 fixed top-0 left-0">
            <div className={`flex flex-col items-center justify-center space-y-6 ${className} relative`}>
                {/* Main spinner container */}
                <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
                    {/* Outer rotating ring */}
                    <div className="absolute inset-0 animate-spin">
                        <div className="w-full h-full border-4 border-transparent border-t-red-600 rounded-full"></div>
                    </div>

                    {/* Inner rotating ring (opposite direction) */}
                    <div className="absolute inset-2 animate-spin-reverse">
                        <div className="w-full h-full border-4 border-transparent border-b-red-500 rounded-full"></div>
                    </div>

                    {/* WMSU Logo in center */}
                    <div className="relative z-10 bg-white rounded-full p-3 shadow-lg">
                        <img
                            src="/storage/images/wmsu_logo.png"
                            alt="WMSU Logo"
                            className="w-12 h-12 object-contain"
                        />
                    </div>
                </div>

                {/* Loading text */}
                {text && (
                    <div className="text-center">
                        <p className={`text-white font-semibold ${textSizes[size]} animate-pulse`}>
                            {text}
                        </p>
                        <div className="flex justify-center space-x-1 mt-4">
                            <div className="w-3 h-3 bg-red-100 rounded-full animate-bounce"></div>
                            <div className="w-3 h-3 bg-red-200 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-3 h-3 bg-red-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-3 h-3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                            <div className="w-3 h-3 bg-red-700 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }}></div>
                            <div className="w-3 h-3 bg-red-800 rounded-full animate-bounce" style={{ animationDelay: '0.7s' }}></div>
                            <div className="w-3 h-3 bg-red-900 rounded-full animate-bounce" style={{ animationDelay: '0.8s' }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Spinner;
