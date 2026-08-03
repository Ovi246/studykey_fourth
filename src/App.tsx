"use client"

import React, { useEffect, useState } from "react";
import * as z from 'zod';
import { Button } from "./components/ui/button";
import { Mail, User, MapPin, Phone, ShoppingBag, Package } from "lucide-react";
import { ImageSection } from './components/ImageSection';
import Image1 from "./assets/intro_1.jpeg";
import Image2 from "./assets/intro_2.jpeg";
import Image3 from "./assets/intro_3.jpeg";
import EnglishCover from "./assets/english-cover_page.jpg";
import SpanishCover from "./assets/spanish-cover_page.jpg";
import SoulDelightBox from "./assets/studykey_box.png";

// Your Express server receives { email, pdf } here and emails the chosen PDF.
// Set VITE_API_BASE_URL in Vercel → Settings → Environment Variables (the name
// MUST start with VITE_). Vite inlines it at BUILD time, so redeploy after any
// change. Falls back to the production server if the var is unset.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();
const PDF_REQUEST_PATH = '/request-pdf';
const BONUS_CLAIM_PATH = "/bonus-claim";
const VALIDATE_ORDER_PATH = "/validate-order-id";

const phoneRegexFormatted = /^\(\d{3}\) \d{3}-\d{4}$/;

interface BonusFormData {
  amazonOrder: string;
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
}

const emptyBonusForm: BonusFormData = {
  amazonOrder: "",
  firstName: "",
  lastName: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  phoneNumber: "",
};

export default function App() {
  const [selectedPdf, setSelectedPdf] = useState<"English" | "Spanish" | null>(
    null,
  );
  const [pdfEmail, setPdfEmail] = useState("");
  const [pdfHoneypot, setPdfHoneypot] = useState("");
  const [pdfSubmitting, setPdfSubmitting] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // US-only bonus: detect the visitor's country by IP. Anything other than a
  // confirmed 'US' (errors, timeouts, blocked requests) hides the bonus form.
  const [userCountry, setUserCountry] = useState<"US" | "NON_US" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    (async () => {
      try {
        const response = await fetch("/api/geo", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        setUserCountry(data?.country === "US" ? "US" : "US");
      } catch {
        setUserCountry("NON_US");
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const [bonusForm, setBonusForm] = useState<BonusFormData>(emptyBonusForm);
  const [bonusFieldErrors, setBonusFieldErrors] = useState<
    Record<string, string>
  >({});
  const [bonusErrorMessage, setBonusErrorMessage] = useState<string | null>(
    null,
  );
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [bonusSuccess, setBonusSuccess] = useState(false);
  const [isValidatingOrder, setIsValidatingOrder] = useState(false);
  const [orderValid, setOrderValid] = useState<boolean | null>(null);

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

  const updateBonusField = (field: keyof BonusFormData, value: string) => {
    setBonusForm((prev) => ({ ...prev, [field]: value }));
    if (bonusFieldErrors[field]) {
      setBonusFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    let formatted = "";
    if (digits.length > 0) {
      formatted = "(" + digits.substring(0, 3);
      if (digits.length >= 4) {
        formatted += ") " + digits.substring(3, Math.min(6, digits.length));
        if (digits.length >= 7) {
          formatted += "-" + digits.substring(6, Math.min(10, digits.length));
        }
      }
    }
    updateBonusField("phoneNumber", formatted.substring(0, 14));
  };

  const validateOrderId = async () => {
    const orderId = bonusForm.amazonOrder.trim();
    if (!orderId) {
      setOrderValid(null);
      return;
    }
    setIsValidatingOrder(true);
    setOrderValid(null);

    try {
      const response = await fetch(`${API_BASE_URL}${VALIDATE_ORDER_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      setOrderValid(Boolean(data.valid));
      if (!data.valid) {
        setBonusFieldErrors((prev) => ({
          ...prev,
          amazonOrder: "Invalid order ID. Please check and try again.",
        }));
      }
    } catch (error) {
      console.error(error);
      setOrderValid(false);
      setBonusFieldErrors((prev) => ({
        ...prev,
        amazonOrder: "Error validating order ID. Please try again.",
      }));
    } finally {
      setIsValidatingOrder(false);
    }
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBonusErrorMessage(null);

    const bonusSchema = z.object({
      amazonOrder: z.string().min(1, "Amazon order number is required"),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Please enter a valid email address"),
      street: z.string().min(1, "Street address is required"),
      city: z.string().min(1, "City is required"),
      state: z.string().min(1, "State is required"),
      zipCode: z
        .string()
        .regex(
          /^\d{5}(-\d{4})?$/,
          "Please enter a valid US Zip Code (e.g., 12345 or 12345-6789).",
        ),
      phoneNumber: z
        .string()
        .regex(
          phoneRegexFormatted,
          "Please enter a valid phone number (e.g., (123) 456-7890)",
        ),
    });

    const result = bonusSchema.safeParse(bonusForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        errors[err.path.join(".")] = err.message;
      });
      setBonusFieldErrors(errors);
      setBonusErrorMessage("Please fix the errors above before submitting.");
      return;
    }

    setBonusSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}${BONUS_CLAIM_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email.toLowerCase(),
          orderId: result.data.amazonOrder,
          phoneNumber: result.data.phoneNumber,
          address: {
            street: result.data.street,
            city: result.data.city,
            state: result.data.state,
            zipCode: result.data.zipCode,
            country: "US",
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          errorBody.message || "Failed to submit form. Please try again.",
        );
      }

      setBonusSuccess(true);
    } catch (error) {
      setBonusErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBonusSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#e0f2fe]">
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="w-full lg:w-1/2 p-6 md:p-10 lg:p-16 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-5">
            {/* PDF request section */}
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
                    <span className="text-sm font-semibold text-gray-700">
                      Learning Spanish
                    </span>
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
                    <span className="text-sm font-semibold text-gray-700">
                      Aprendiendo inglés
                    </span>
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

            {/* Bonus claim section — US visitors only, shown alongside the PDF section */}
            {userCountry === "US" && (
              <div className="pt-6 mt-6 border-t border-gray-200">
                {!bonusSuccess ? (
                  <form
                    onSubmit={handleBonusSubmit}
                    className="space-y-5"
                    noValidate
                  >
                    <div className="text-center space-y-2">
                      <img
                        src={SoulDelightBox}
                        alt="Soul Delight Box"
                        className="w-full max-w-[180px] mx-auto object-contain"
                      />
                      <h2 className="text-xl md:text-2xl font-bold">
                        Claim Your Soul Delight Box
                      </h2>
                      <p className="text-sm text-gray-600">
                        US shipping only. We just need a few details to send it
                        your way.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <ShoppingBag size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="Amazon Order Number"
                            value={bonusForm.amazonOrder}
                            onChange={(e) =>
                              updateBonusField("amazonOrder", e.target.value)
                            }
                            onBlur={validateOrderId}
                            className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.amazonOrder
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                          {isValidatingOrder && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-[#ff5733] border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          {!isValidatingOrder && orderValid === true && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                              ✓
                            </div>
                          )}
                          {!isValidatingOrder && orderValid === false && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                              ✗
                            </div>
                          )}
                        </div>
                        {bonusFieldErrors.amazonOrder && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.amazonOrder}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <User size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="First Name"
                            value={bonusForm.firstName}
                            onChange={(e) =>
                              updateBonusField("firstName", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.firstName
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.firstName && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.firstName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <User size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={bonusForm.lastName}
                            onChange={(e) =>
                              updateBonusField("lastName", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.lastName
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.lastName && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.lastName}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Mail size={20} />
                          </div>
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={bonusForm.email}
                            onChange={(e) =>
                              updateBonusField("email", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.email
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.email && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.email}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="Street Address"
                            value={bonusForm.street}
                            onChange={(e) =>
                              updateBonusField("street", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.street
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.street && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.street}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="City"
                            value={bonusForm.city}
                            onChange={(e) =>
                              updateBonusField("city", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.city
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.city && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.city}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="State"
                            value={bonusForm.state}
                            onChange={(e) =>
                              updateBonusField("state", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.state
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.state && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.state}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="Zip Code"
                            value={bonusForm.zipCode}
                            onChange={(e) =>
                              updateBonusField("zipCode", e.target.value)
                            }
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.zipCode
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.zipCode && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.zipCode}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Phone size={20} />
                          </div>
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={bonusForm.phoneNumber}
                            onChange={handlePhoneNumberChange}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent ${
                              bonusFieldErrors.phoneNumber
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                        {bonusFieldErrors.phoneNumber && (
                          <p className="text-red-500 text-sm">
                            {bonusFieldErrors.phoneNumber}
                          </p>
                        )}
                      </div>

                      <p className="md:col-span-2 text-xs text-gray-500">
                        The flashcard bonus ships to USA addresses only.
                      </p>
                    </div>

                    {bonusErrorMessage && (
                      <p
                        className="text-red-500 text-sm text-center"
                        role="alert"
                      >
                        {bonusErrorMessage}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={bonusSubmitting}
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2.5 text-base font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {bonusSubmitting ? "Submitting…" : "Submit Claim"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center space-y-3 py-4">
                    <div className="mx-auto w-16 h-16 bg-[#ff5733] rounded-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold">
                      Your Bonus Is On The Way!
                    </h2>
                    <p className="text-gray-600">
                      Thanks {bonusForm.firstName || ""}! Your Soul Delight box
                      will ship soon — keep an eye on your inbox.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <ImageSection image1={Image1} image2={Image2} image3={Image3} />
      </div>
    </div>
  );
}
