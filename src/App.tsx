"use client"

import React, { useState } from "react";
import * as z from 'zod';
import { Button } from "./components/ui/button";
import { Mail } from "lucide-react";
import { ImageSection } from './components/ImageSection';
import Image1 from "./assets/intro_1.jpeg";
import Image2 from "./assets/intro_2.jpeg";
import Image3 from "./assets/intro_3.jpeg";
import EnglishCover from "./assets/english-cover_page.jpg";
import SpanishCover from "./assets/spanish-cover_page.jpg";

const getApiBaseUrl = (): string | undefined => {
  const runtimeProcess =
    typeof globalThis !== "undefined"
      ? (
          globalThis as typeof globalThis & {
            process?: {
              env?: Record<string, string | undefined>;
            };
          }
        ).process
      : undefined;

  const nextPublicApiBaseUrl =
    runtimeProcess?.env?.NEXT_PUBLIC_API_BASE_URL?.trim();

  const viteApiBaseUrl =
    typeof import.meta !== "undefined"
      ? import.meta.env.VITE_API_BASE_URL?.trim()
      : undefined;

  return nextPublicApiBaseUrl || viteApiBaseUrl;
};

// Your Express server receives { email, pdf } here and emails the chosen PDF.
const API_BASE_URL = getApiBaseUrl() ;
const PDF_REQUEST_PATH = '/request-pdf';

export default function App() {
  const [selectedPdf, setSelectedPdf] = useState<"English" | "Spanish" | null>(
    null,
  );
  const [pdfEmail, setPdfEmail] = useState("");
  const [pdfHoneypot, setPdfHoneypot] = useState("");
  const [pdfSubmitting, setPdfSubmitting] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const selectPdf = (pdf: "English" | "Spanish") => {
    setSelectedPdf(pdf);
    if (pdfError) setPdfError(null);
  };

  const handlePdfRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPdfError(null);

    // Honeypot: this hidden field is invisible to real users. If it's filled,
    // it's almost certainly a bot — pretend success without hitting the server.
    if (pdfHoneypot.trim() !== "") {
      setPdfSuccess(true);
      return;
    }

    // Client-side validation. The server MUST re-validate all of this — never
    // trust the client (see PDF_REQUEST_BACKEND_SPEC.md).
    const pdfRequestSchema = z.object({
      pdf: z.enum(["English", "Spanish"], {
        errorMap: () => ({ message: "Please choose a PDF above." }),
      }),
      email: z
        .string()
        .trim()
        .min(1, "Please enter your email address.")
        .max(254, "That email address is too long.")
        .email("Please enter a valid email address."),
    });

    const result = pdfRequestSchema.safeParse({
      pdf: selectedPdf ?? undefined,
      email: pdfEmail,
    });

    if (!result.success) {
      setPdfError(result.error.errors[0].message);
      return;
    }

    setPdfSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_BASE_URL}${PDF_REQUEST_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: result.data.email.toLowerCase(),
          pdf: result.data.pdf,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const tooMany = response.status === 429;
        throw new Error(
          errorBody.message ||
            (tooMany
              ? "Too many requests. Please wait a moment and try again."
              : "We could not send your PDF right now. Please try again."),
        );
      }

      setPdfSuccess(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setPdfError(
          "The request timed out. Please check your connection and try again.",
        );
      } else if (error instanceof Error) {
        setPdfError(error.message);
      } else {
        setPdfError("Something went wrong. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setPdfSubmitting(false);
    }
  };

  const resetPdfRequest = () => {
    setPdfSuccess(false);
    setSelectedPdf(null);
    setPdfEmail("");
    setPdfError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#e0f2fe]">
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="w-full lg:w-1/2 p-6 md:p-10 lg:p-16 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-5">
            {!pdfSuccess ? (
              <form
                onSubmit={handlePdfRequest}
                className="space-y-5"
                noValidate
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold leading-snug">
                    Thank you for your purchase! Here is your additional
                    learning material to help you learn faster!
                  </h1>
                  <h2 className="text-lg md:text-xl font-semibold">
                    Get your eBook
                  </h2>
                  <p className="text-sm text-gray-600">
                    Choose your desired PDF, enter your email, and we&apos;ll
                    send it straight to your inbox.
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => selectPdf("English")}
                    aria-pressed={selectedPdf === "English"}
                    aria-label="Choose the English PDF"
                    className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff5733] ${
                      selectedPdf === "English"
                        ? "border-[#ff5733] ring-2 ring-[#ff5733] bg-orange-50"
                        : "border-gray-200 hover:border-[#ff5733]/60"
                    }`}
                  >
                    {selectedPdf === "English" && (
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff5733] text-white text-sm">
                        ✓
                      </span>
                    )}
                    <img
                      src={EnglishCover}
                      alt="English learning PDF cover"
                      className="h-44 md:h-56 w-auto object-contain rounded-lg"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectPdf("Spanish")}
                    aria-pressed={selectedPdf === "Spanish"}
                    aria-label="Choose the Spanish PDF"
                    className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ff5733] ${
                      selectedPdf === "Spanish"
                        ? "border-[#ff5733] ring-2 ring-[#ff5733] bg-orange-50"
                        : "border-gray-200 hover:border-[#ff5733]/60"
                    }`}
                  >
                    {selectedPdf === "Spanish" && (
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff5733] text-white text-sm">
                        ✓
                      </span>
                    )}
                    <img
                      src={SpanishCover}
                      alt="Spanish learning PDF cover"
                      className="h-44 md:h-56 w-auto object-contain rounded-lg"
                    />
                  </button>
                </div>

                {/* Honeypot: hidden from real users; bots that fill it are rejected. */}
                <div className="hidden" aria-hidden="true">
                  <label>
                    Leave this field empty
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={pdfHoneypot}
                      onChange={(e) => setPdfHoneypot(e.target.value)}
                    />
                  </label>
                </div>

                {/* Quick one-line email + submit */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail size={20} />
                    </div>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="you@example.com"
                      aria-label="Email address"
                      aria-invalid={pdfError ? true : undefined}
                      value={pdfEmail}
                      onChange={(e) => {
                        setPdfEmail(e.target.value);
                        if (pdfError) setPdfError(null);
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                        pdfError ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={pdfSubmitting}
                    className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-6 py-2.5 text-base font-medium whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pdfSubmitting ? "Sending…" : "Send me the PDF"}
                  </Button>
                </div>

                {pdfError && (
                  <p className="text-red-500 text-sm text-center" role="alert">
                    {pdfError}
                  </p>
                )}
                <p className="text-xs text-gray-500 text-center">
                  We&apos;ll only use your email to send the PDF you chose.
                </p>
              </form>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto w-16 h-16 bg-[#ff5733] rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Check your inbox!
                </h1>
                <p className="text-gray-600">
                  We&apos;ve sent your {selectedPdf} PDF to{" "}
                  <span className="font-medium break-all">{pdfEmail}</span>. It
                  can take a couple of minutes to arrive — remember to check
                  your spam folder.
                </p>
                <button
                  type="button"
                  onClick={resetPdfRequest}
                  className="text-[#ff5733] hover:underline text-sm font-medium"
                >
                  Choose another PDF
                </button>
              </div>
            )}
          </div>
        </div>
        <ImageSection image1={Image1} image2={Image2} image3={Image3} />
      </div>
    </div>
  );
}
