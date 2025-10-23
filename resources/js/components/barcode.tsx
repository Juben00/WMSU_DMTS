import React, { useRef, useState } from 'react';
import { Download, Copy } from 'lucide-react';
import { Document, Packer, Paragraph, ImageRun, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import Barcode from 'react-barcode';

interface BarcodeProps {
    barcode_path?: string;
    barcode_value?: string;
    className?: string;
}

const BarcodeComponent: React.FC<BarcodeProps> = ({
    barcode_path,
    barcode_value,
    className = '',
}) => {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const barcodeRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        if (barcode_value) {
            try {
                await navigator.clipboard.writeText(barcode_value);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy barcode value:', err);
            }
        }
    };

    const generateDocument = async () => {
        setDownloading(true);

        try {
            console.log('Starting DOCX generation...');

            // Helper function to convert image to base64
            const imageToBase64 = async (imagePath: string): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';

                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        canvas.width = img.width;
                        canvas.height = img.height;

                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            const base64 = canvas.toDataURL('image/png').split(',')[1];
                            resolve(base64);
                        } else {
                            reject(new Error('Could not get canvas context'));
                        }
                    };

                    img.onerror = (error) => {
                        console.error('Error loading image:', error);
                        reject(error);
                    };

                    img.src = imagePath + '?t=' + Date.now();
                });
            };

            // Generate barcode image as base64
            let barcodeImageData: string | null = null;

            if (barcode_value) {
                try {
                    // Create a temporary canvas to generate barcode
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        // Set canvas dimensions
                        canvas.width = 300;
                        canvas.height = 100;

                        // Create a temporary div to render the barcode
                        const tempDiv = document.createElement('div');
                        tempDiv.style.position = 'absolute';
                        tempDiv.style.left = '-9999px';
                        document.body.appendChild(tempDiv);

                        // Import JsBarcode dynamically
                        const JsBarcode = (await import('jsbarcode')).default;

                        // Generate barcode on canvas
                        JsBarcode(canvas, barcode_value, {
                            format: "CODE128",
                            width: 2,
                            height: 100,
                            displayValue: false,
                            background: "#ffffff",
                            lineColor: "#000000"
                        });

                        // Convert canvas to base64
                        barcodeImageData = canvas.toDataURL('image/png').split(',')[1];

                        // Clean up
                        document.body.removeChild(tempDiv);

                        console.log('Successfully generated barcode as base64');
                    }
                } catch (error) {
                    console.warn('Failed to generate barcode:', error);
                }
            }

            // Try to get WMSU logo as base64
            let logoImageData: string | null = null;
            try {
                const logoPath = `${window.location.origin}/storage/images/wmsu_logo.png`;
                logoImageData = await imageToBase64(logoPath);
                console.log('Successfully converted logo to base64');
            } catch (logoError) {
                console.warn('Could not load WMSU logo:', logoError);
            }

            // Create document content
            const documentChildren: (Paragraph)[] = [];

            // Add logo if available
            if (logoImageData) {
                documentChildren.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new ImageRun({
                                data: logoImageData,
                                transformation: {
                                    width: 60,
                                    height: 60,
                                },
                                type: 'png',
                            }),
                        ],
                        spacing: { after: 200 },
                    })
                );
            }

            // Add header
            documentChildren.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "WMSU DMTS",
                            bold: true,
                            size: 32,
                            color: "DC2626", // Red color
                        }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "Document Management & Tracking System",
                            size: 20,
                            color: "6B7280", // Gray color
                        }),
                    ],
                    spacing: { after: 400 },
                })
            );

            // Add barcode image if available
            if (barcodeImageData) {
                documentChildren.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new ImageRun({
                                data: barcodeImageData,
                                transformation: {
                                    width: 300,
                                    height: 100,
                                },
                                type: 'png',
                            }),
                        ],
                        spacing: { after: 200 },
                    })
                );
            } else {
                // Add placeholder text if barcode image is not available
                documentChildren.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: "Barcode image could not be loaded",
                                italics: true,
                                color: "9CA3AF", // Gray color
                            }),
                        ],
                        spacing: { after: 200 },
                    })
                );
            }

            // Add barcode value
            if (barcode_value) {
                documentChildren.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: barcode_value,
                                font: "Courier New",
                                bold: true,
                                size: 24,
                                color: "1F2937", // Dark gray
                            }),
                        ],
                        spacing: { after: 400 },
                    })
                );
            } else {
                documentChildren.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: "N/A",
                                color: "9CA3AF", // Gray color
                            }),
                        ],
                        spacing: { after: 400 },
                    })
                );
            }

            // Add footer
            const currentDate = format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a');
            documentChildren.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: `Generated on ${currentDate}`,
                            size: 16,
                            color: "9CA3AF",
                        }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: "Western Mindanao State University",
                            size: 16,
                            color: "9CA3AF",
                        }),
                    ],
                })
            );

            // Create the document
            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: documentChildren,
                    },
                ],
            });

            // Generate and save the document
            const buffer = await Packer.toBlob(doc);
            const fileName = `WMSU-DMTS-Barcode-${format(new Date(), 'yyyyMMdd-HHmmss')}.docx`;

            saveAs(buffer, fileName);
            console.log('DOCX generated successfully');

        } catch (error) {
            console.error('Error generating DOCX:', error);

            // Show a more detailed error message
            let errorMessage = 'Failed to generate document. ';
            if (error instanceof Error) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please check the console for more details.';
            }

            alert(errorMessage);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-md mx-auto p-6 ${className}`}
        >
            {/* Barcode Display */}
            <div className="flex flex-col items-center space-y-4">
                {barcode_path ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 shadow-inner">
                        <img
                            src={`/storage/${barcode_path}`}
                            alt="Document Barcode"
                            className="max-h-32 mx-auto"
                            style={{ imageRendering: 'pixelated' }}
                        />
                    </div>
                ) : (
                    <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No barcode available
                        </p>
                    </div>
                )}

                {/* Barcode Value & Actions */}
                <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-5 py-3 flex items-center justify-between shadow-sm">
                    <span className="font-mono text-lg font-semibold text-gray-800 dark:text-gray-200 tracking-wide">
                        {barcode_value || "N/A"}
                    </span>

                    <div className="flex items-center gap-2">
                        {barcode_value && (
                            <button
                                onClick={handleCopy}
                                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={copied ? "Copied!" : "Copy barcode value"}
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={generateDocument}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download as Word Document"
                        >
                            <Download
                                className={`w-4 h-4 ${downloading ? "animate-bounce" : ""}`}
                            />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                    </div>
                </div>

                {copied && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Copied to clipboard!
                    </p>
                )}
            </div>
        </div>
    );

};

export default BarcodeComponent;
