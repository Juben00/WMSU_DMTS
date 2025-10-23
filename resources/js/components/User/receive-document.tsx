import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, BarChart3 } from "lucide-react"

const ReceiveDocument = ({ setShowBarcodeModal, handleSubmit, data, processing, setData }: { setShowBarcodeModal: (show: boolean) => void, handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void, data: { barcode_value: string }, processing: boolean, setData: (name: string, value: string) => void }) => {

    return (

        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md relative">
                <button
                    className="absolute top-3 right-3 cursor-pointer text-gray-400 hover:text-red-600"
                    onClick={() => setShowBarcodeModal(false)}
                >
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-red-600" />
                    Receive Document
                </h2>
                <p className="mb-4 text-slate-600 dark:text-slate-300">Enter the barcode value provided with your document to receive it.</p>
                <form
                    onSubmit={handleSubmit}
                >
                    <Input
                        type="text"
                        placeholder="Enter barcode value..."
                        value={data.barcode_value}
                        onChange={e => setData('barcode_value', e.target.value)}
                        className="mb-4 h-12 text-lg"
                        required
                        autoFocus
                    />
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-lg"
                        disabled={processing || !data.barcode_value.trim()}
                    >
                        {processing ? "Searching..." : "Search Document"}
                    </Button>
                </form>
            </div>
        </div>
    )
}

export default ReceiveDocument
