"use client";

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export interface SignaturePadRef {
    getSignature: () => string | null;
    clear: () => void;
}

const SignaturePad = forwardRef<SignaturePadRef>((props, ref) => {
    const padRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
        getSignature: () => {
            if (padRef.current?.isEmpty()) {
                return null;
            }
            return padRef.current?.getTrimmedCanvas().toDataURL('image/png') || null;
        },
        clear: () => {
            padRef.current?.clear();
        }
    }));

    return (
        <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
            <SignatureCanvas
                ref={padRef}
                canvasProps={{
                    className: 'w-full h-40 cursor-crosshair'
                }}
                penColor="black"
            />
            <div className="bg-slate-100 p-2 text-right border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => padRef.current?.clear()}
                    className="text-xs text-slate-600 hover:text-red-600 font-medium px-3 py-1 rounded"
                >
                    Limpiar firma
                </button>
            </div>
        </div>
    );
});

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;