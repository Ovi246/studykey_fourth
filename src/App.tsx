"use client"

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { create } from 'zustand';
import * as z from 'zod';
import { Button } from "./components/ui/button";
import { Mail, User, Globe, Package, MapPin, ShoppingBag } from 'lucide-react';
import { ImageSection } from './components/ImageSection';


function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

interface AppStore {
  selectedOption: 'pdf' | 'bonus' | null;
  setSelectedOption: (option: 'pdf' | 'bonus') => void;
  formData: {
    email?: string;
    amazonOrder?: string;
    reviewLink?: string;
    shippingName?: string;
    mailingAddress?: string;
    name?: string;
    language?: string;
    set?: string;
    asin?: string;
  };
  setFormData: (data: Partial<AppStore['formData']>) => void;
}

const useAppStore = create<AppStore>((set) => ({
  selectedOption: null,
  setSelectedOption: (option: 'pdf' | 'bonus') => set({ selectedOption: option }),
  formData: {},
  setFormData: (data: Partial<AppStore['formData']>) => set((state) => ({ formData: { ...state.formData, ...data } })),
}));

const queryClient = new QueryClient();

export default function App() {
  const [currentStep, setCurrentStep] = useState<'intro' | 'pdfForm' | 'pdfThankYou' | 'bonusForm' | 'bonusThankYou'>('intro');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ isValid: boolean; asin?: string } | null>(null);
  const { selectedOption, setSelectedOption, formData, setFormData } = useAppStore();

  const API_BASE_URL = 'http://localhost:5000';

  const validateOrderId = async (orderId: string) => {
    if (!orderId) {
      setValidationStatus(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/validate-order-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (data.valid) {
        setValidationStatus({ isValid: true, asin: data.asin || '' });
        if (data.asin) {
          const reviewLink = `https://www.amazon.com/review/create-review?asin=${data.asin}`;
          setFormData({ reviewLink, asin: data.asin });
        }
      } else {
        setValidationStatus({ isValid: false });
        setErrorMessage('Invalid order ID. Please check and try again.');
      }
    } catch (error) {
      console.error(error);
      setValidationStatus({ isValid: false });
      setErrorMessage('Error validating order ID. Please try again.');
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(1),
      language: z.string().min(1)
    });

    try {
      schema.parse(formData);
      // API call would go here
      setCurrentStep('pdfThankYou');
    } catch (error) {
      setErrorMessage('Please fill in all required fields correctly.');
    }
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schema = z.object({
      amazonOrder: z.string().min(1),
      shippingName: z.string().min(1),
      mailingAddress: z.string().min(1),
      email: z.string().email(),
      name: z.string().min(1),
      language: z.string().min(1),
      set: z.string().min(1)
    });

    try {
      schema.parse(formData);
      if (!validationStatus?.isValid) {
        setErrorMessage('Please validate your order ID first.');
        return;
      }
      // API call would go here
      setCurrentStep('bonusThankYou');
    } catch (error) {
      setErrorMessage('Please fill in all required fields correctly.');
    }
  };

  const renderFormInput = (
    placeholder: string,
    name: keyof AppStore['formData'],
    icon: React.ReactNode,
    type: string = 'text'
  ) => (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        onChange={(e) => setFormData({ [name]: e.target.value })}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent"
      />
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen w-full bg-[#e0f2fe]">
        {currentStep === 'intro' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            {/* Left half - Text content */}
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center items-center">
              <div className="max-w-xl mx-auto space-y-8">
                <h1 className="text-2xl md:text-3xl font-bold text-center">
                  HOLA! Thank you for your order - let&apos;s make your learning journey even better with a special gift
                  just for you!
                </h1>

                {/* Option 1 */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Option 1: I want the FREE E-BOOK only</h2>
                    <p className="text-gray-700">A fast boost for your Spanish practice</p>
                  </div>

                  <div className="h-24 w-80">
                    <img
                      src="/placeholder.svg?height=100&width=300"
                      alt="Spanish E-Books"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-8 py-2 text-lg font-medium"
                      onClick={() => { setSelectedOption('pdf'); setCurrentStep('pdfForm'); }}
                    >
                      Get My PDF Now
                    </Button>
                  </div>
                </div>

                {/* Option 2 */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Option 2: I want the PDF + FREE Flashcard Set!</h2>
                    <p className="text-gray-700">A great mixture of fun and learning</p>
                  </div>

                  <div className="h-24 w-80">
                    <img
                      src="/placeholder.svg?height=100&width=300"
                      alt="Spanish Flashcard Set"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-8 py-2 text-lg font-medium"
                      onClick={() => { setSelectedOption('bonus'); setCurrentStep('bonusForm'); }}
                    >
                      Continue to Bonus
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right half - Images */}
            <ImageSection />
          </div>
        )}

        {currentStep === 'pdfForm' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
              <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Get Your Free PDF</h2>
                  <p className="text-gray-600">Fill in your details to receive your study materials</p>
                </div>

                <form onSubmit={handlePdfSubmit} className="space-y-6">
                  {renderFormInput("Your Name", "name", <User size={20} />)}
                  {renderFormInput("Language", "language", <Globe size={20} />)}
                  {renderFormInput("Email Address", "email", <Mail size={20} />, "email")}
                  
                  {errorMessage && (
                    <p className="text-red-500 text-sm">{errorMessage}</p>
                  )}

                  <div className="space-y-4">
                    <Button 
                      type="submit"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                    >
                      Send Me the PDF
                    </Button>

                    <Button 
                      type="button"
                      className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                      onClick={() => setCurrentStep('intro')}
                    >
                      Go Back
                    </Button>
                  </div>
                </form>
              </div>
            </div>
            <ImageSection />
          </div>
        )}

        {currentStep === 'bonusForm' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
              <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Claim Your Bonus Set</h2>
                  <p className="text-gray-600">Complete your information to receive both gifts</p>
                </div>

                <form onSubmit={handleBonusSubmit} className="space-y-6">
                  {renderFormInput("Amazon Order Number", "amazonOrder", <ShoppingBag size={20} />)}
                  {validationStatus?.isValid && (
                    <p className="text-green-500 text-sm">✓ Order verified successfully</p>
                  )}
                  {renderFormInput("Shipping Name", "shippingName", <User size={20} />)}
                  {renderFormInput("Mailing Address", "mailingAddress", <MapPin size={20} />)}
                  {renderFormInput("Email Address", "email", <Mail size={20} />, "email")}
                  {renderFormInput("Your Name", "name", <User size={20} />)}
                  {renderFormInput("Language", "language", <Globe size={20} />)}
                  {renderFormInput("Set", "set", <Package size={20} />)}

                  {errorMessage && (
                    <p className="text-red-500 text-sm">{errorMessage}</p>
                  )}

                  <div className="space-y-4">
                    <Button 
                      type="submit"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                    >
                      Claim My Bonus Set
                    </Button>

                    <Button 
                      type="button"
                      className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                      onClick={() => setCurrentStep('intro')}
                    >
                      Go Back
                    </Button>
                  </div>
                </form>
              </div>
            </div>
            <ImageSection />
          </div>
        )}

        {(currentStep === 'pdfThankYou' || currentStep === 'bonusThankYou') && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center items-center">
              <div className="max-w-xl mx-auto space-y-8 text-center">
                <div className="mx-auto w-20 h-20 bg-[#ff5733] rounded-full flex items-center justify-center">
                  {currentStep === 'pdfThankYou' ? (
                    <Mail className="w-10 h-10 text-white" />
                  ) : (
                    <Package className="w-10 h-10 text-white" />
                  )}
                </div>

                <h2 className="text-2xl font-bold">
                  {currentStep === 'pdfThankYou' ? 'Check Your Inbox!' : 'Your Gifts Are On The Way!'}
                </h2>
                
                <p className="text-gray-600">
                  {currentStep === 'pdfThankYou' 
                    ? "We've sent your PDF to your email address. Happy learning!"
                    : "Check your email for the PDF and expect your flashcard set soon!"}
                </p>

                <div className="space-y-4">
                  <Button 
                    className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                    onClick={() => window.alert('Download started - check your email.')}
                  >
                    Download PDF Now
                  </Button>

                  {currentStep === 'pdfThankYou' && (
                    <Button 
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                      onClick={() => { setSelectedOption('bonus'); setCurrentStep('bonusForm'); }}
                    >
                      Get Bonus Flashcard Set
                    </Button>
                  )}

                  <Button 
                    className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                    onClick={() => setCurrentStep('intro')}
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            </div>
            <ImageSection />
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}