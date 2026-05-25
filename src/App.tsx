"use client"

import React, { useState, useEffect } from 'react';
import { create } from 'zustand';
import * as z from 'zod';
import { Button } from "./components/ui/button";
import { Mail, User, Globe, Package, MapPin, ShoppingBag } from 'lucide-react';
import { ImageSection } from './components/ImageSection';
import Booklet from "./assets/booklet.png"
import SoulDelightBox from "./assets/studykey_box.png"
import Image1 from "./assets/intro_1.jpeg"
import Image2 from "./assets/intro_2.jpeg"
import Image3 from "./assets/intro_3.jpeg"

const PDF_LINK_ENGLISH = 'https://go.studykey.ca/english-pdf';
const PDF_LINK_SPANISH = 'https://go.studykey.ca/spanish-pdf';

const phoneRegexFormatted = /^\(\d{3}\) \d{3}-\d{4}$/;

interface AppStore {
  formData: {
    email?: string;
    amazonOrder?: string;
    firstName?: string;
    lastName?: string;
    language?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    phoneNumber?: string;
  };
  setFormData: (data: Partial<AppStore['formData']>) => void;
  setAddressFormData: (data: Partial<AppStore['formData']['address']>) => void;
}

const useAppStore = create<AppStore>((set) => ({
  formData: { address: {} },
  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  setAddressFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, address: { ...state.formData.address, ...data } },
    })),
}));

type Step = 'detecting' | 'landing' | 'bonusForm' | 'bonusThankYou';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('detecting');
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ isValid: boolean } | null>(null);
  const { formData, setFormData, setAddressFormData } = useAppStore();
  const [isValidating, setIsValidating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setErrorMessage(null);
    setFieldErrors({});
  }, [currentStep]);

  // Detect visitor country by IP. Anything other than a confirmed 'US' (errors,
  // timeouts, blocked requests) falls back to NON_US → no bonus path shown.
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    (async () => {
      try {
        const response = await fetch('/api/geo', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        const detectedCountry = data?.country === 'US' ? 'US' : 'NON_US';
        setUserCountry(detectedCountry);
        if (detectedCountry === 'US') {
          setAddressFormData({ country: 'US' });
        }
      } catch {
        setUserCountry('NON_US');
      } finally {
        clearTimeout(timeoutId);
        setCurrentStep('landing');
      }
    })();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const API_BASE_URL = 'https://studykey-riddles-server.vercel.app';

  const validateOrderId = async (orderId: string) => {
    if (!orderId) {
      setValidationStatus(null);
      setFieldErrors((prev) => {
        const newState = { ...prev };
        delete newState.amazonOrder;
        return newState;
      });
      return;
    }
    setIsValidating(true);
    setValidationStatus(null);
    setFieldErrors((prev) => {
      const newState = { ...prev };
      delete newState.amazonOrder;
      return newState;
    });

    try {
      const response = await fetch(`${API_BASE_URL}/validate-order-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (data.valid) {
        setValidationStatus({ isValid: true });
        setFieldErrors((prev) => {
          const newState = { ...prev };
          delete newState.amazonOrder;
          return newState;
        });
      } else {
        setValidationStatus({ isValid: false });
        setFieldErrors((prev) => ({
          ...prev,
          amazonOrder: 'Invalid order ID. Please check and try again.',
        }));
      }
    } catch (error) {
      console.error(error);
      setValidationStatus({ isValid: false });
      setFieldErrors((prev) => ({
        ...prev,
        amazonOrder: 'Error validating order ID. Please try again.',
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const validateField = <
    T extends keyof AppStore['formData'] | `address.${keyof NonNullable<AppStore['formData']['address']>}`
  >(
    name: T,
    value: unknown,
    schema: z.ZodSchema<unknown>
  ) => {
    try {
      schema.parse(value);
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const newState = { ...prev };
          delete newState[name];
          return newState;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors((prev) => ({ ...prev, [name]: error.errors[0].message }));
      } else {
        console.error(`Error validating field ${name}:`, error);
        setErrorMessage(`Error validating ${name}.`);
      }
    }
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const bonusSchema = z.object({
      amazonOrder: z.string().min(1, 'Amazon order number is required'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      language: z.string().min(1, 'Language is required'),
      email: z.string().email('Please enter a valid email address'),
      address: z.object({
        street: z.string().min(1, 'Street address is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State/Province is required'),
        zipCode: z.string().min(1, 'Zip/Postal Code is required'),
        country: z.string().min(1, 'Country is required'),
      }),
      phoneNumber: z
        .string()
        .regex(phoneRegexFormatted, 'Please enter a valid phone number (e.g., (123) 456-7890)'),
    });

    try {
      bonusSchema.parse(formData);

      const bonusPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        language: formData.language,
        email: formData.email,
        orderId: formData.amazonOrder,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
      };

      const response = await fetch(`${API_BASE_URL}/bonus-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bonusPayload),
      });

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ message: 'Failed to submit form.' }));
        throw new Error(errorBody.message || 'Failed to submit form. Please try again.');
      }

      setCurrentStep('bonusThankYou');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          errors[err.path.join('.')] = err.message;
        });
        setFieldErrors(errors);
        setErrorMessage('Please fix the errors above before submitting.');
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      console.error('Submission error:', error);
    }
  };

  const renderFormInput = (
    placeholder: string,
    name: keyof AppStore['formData'] | `address.${keyof NonNullable<AppStore['formData']['address']>}`,
    icon: React.ReactNode,
    type: string = 'text',
    onBlur?: () => void,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => {
    const getValue = (path: string): string => {
      const keys = path.split('.');
      let value: unknown = formData;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return '';
        }
      }
      return String(value || '');
    };

    const setValue = (path: string, value: string) => {
      const keys = path.split('.');
      if (keys[0] === 'address') {
        setAddressFormData({ [keys[1]]: value });
      } else {
        setFormData({ [keys[0]]: value });
      }
    };

    const error = fieldErrors[name];
    const value = getValue(name);
    const prClass =
      name === 'amazonOrder' && (isValidating || validationStatus) ? 'pr-10' : 'pr-4';

    return (
      <div className="relative w-full">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
          <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={
              onChange
                ? onChange
                : (e) => {
                  setValue(name, e.target.value);
                  if (name !== 'amazonOrder' && fieldErrors[name]) {
                    setFieldErrors((prev) => {
                      const newState = { ...prev };
                      delete newState[name];
                      return newState;
                    });
                  }
                }
            }
            onBlur={onBlur}
            className={`w-full pl-10 ${prClass} py-2 border ${error ? 'border-red-500' : 'border-gray-200'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent`}
          />
          {name === 'amazonOrder' && isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#ff5733] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {name === 'amazonOrder' && validationStatus?.isValid && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</div>
          )}
          {name === 'amazonOrder' && validationStatus?.isValid === false && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">✗</div>
          )}
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  };

  interface SelectOption {
    value: string;
    label: string;
  }

  const renderSelectInput = (
    placeholder: string,
    name: keyof AppStore['formData'] | `address.${keyof NonNullable<AppStore['formData']['address']>}`,
    icon: React.ReactNode,
    options: SelectOption[],
    onBlur?: () => void
  ) => {
    const getValue = (path: string): string => {
      const keys = path.split('.');
      let value: unknown = formData;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return '';
        }
      }
      return String(value || '');
    };

    const setValue = (path: string, value: string) => {
      const keys = path.split('.');
      if (keys[0] === 'address') {
        setAddressFormData({ [keys[1]]: value });
      } else {
        setFormData({ [keys[0]]: value });
      }
    };

    const error = fieldErrors[name];
    const value = getValue(name);

    return (
      <div className="relative w-full">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
          <select
            value={value}
            onChange={(e) => {
              setValue(name, e.target.value);
              if (fieldErrors[name]) {
                setFieldErrors((prev) => {
                  const newState = { ...prev };
                  delete newState[name];
                  return newState;
                });
              }
            }}
            onBlur={onBlur}
            className={`w-full pl-10 pr-8 py-2 border ${error ? 'border-red-500' : 'border-gray-200'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent appearance-none bg-white`}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    let formattedValue = '';
    if (value.length > 0) {
      formattedValue = '(' + value.substring(0, 3);
      if (value.length >= 4) {
        formattedValue += ') ' + value.substring(3, Math.min(6, value.length));
        if (value.length >= 7) {
          formattedValue += '-' + value.substring(6, Math.min(10, value.length));
        }
      }
    }
    if (formattedValue.length > 14) formattedValue = formattedValue.substring(0, 14);
    setFormData({ phoneNumber: formattedValue });
    if (fieldErrors.phoneNumber) {
      setFieldErrors((prev) => {
        const newState = { ...prev };
        delete newState.phoneNumber;
        return newState;
      });
    }
  };

  const languageOptions = [
    { value: '', label: 'Select Language' },
    { value: 'English', label: 'I am learning English' },
    { value: 'Spanish', label: 'I am learning Spanish' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#e0f2fe]">
      {currentStep === 'detecting' && (
        <div className="flex flex-col lg:flex-row min-h-screen">
          <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center items-center">
            <div className="max-w-xl mx-auto space-y-6 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#ff5733] border-t-transparent rounded-full animate-spin" />
              <p className="text-lg text-gray-700 text-center">Loading your gift options…</p>
            </div>
          </div>
          <ImageSection image1={Image1} image2={Image2} image3={Image3} />
        </div>
      )}

      {currentStep === 'landing' && (
        <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/2 h-full flex flex-col justify-center items-center p-5 md:p-8 lg:p-10 overflow-y-auto">
            <div className="w-full max-w-xl mx-auto space-y-3">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-center leading-snug">
                Thank you for your purchase! Here is your additional learning material to help you learn faster!
              </h1>

              <h2 className="text-lg md:text-xl font-semibold text-center">Get your eBook</h2>

              <div className="w-full max-w-xs mx-auto">
                <img src={Booklet} alt="Spanish E-Books" className="w-full h-28 md:h-36 object-contain" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm text-gray-600 text-center">
                    Si estás aprendiendo inglés, descarga este enlace.
                  </p>
                  <a
                    href={PDF_LINK_ENGLISH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-8 py-2.5 text-base font-medium text-center transition-colors duration-200"
                  >
                    📘 English PDF
                  </a>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm text-gray-600 text-center">
                    If you're learning Spanish, download this link.
                  </p>
                  <a
                    href={PDF_LINK_SPANISH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-8 py-2.5 text-base font-medium text-center transition-colors duration-200"
                  >
                    📗 Spanish PDF
                  </a>
                </div>
              </div>

              {userCountry === 'US' && (
                <div className="pt-4 mt-1 border-t border-gray-300 space-y-3 text-center">
                  <h2 className="font-semibold text-center leading-snug">
                    <span className="block text-xl md:text-2xl lg:text-3xl">Get your downloadable learning materials</span>
                    <span className="block text-base md:text-lg text-gray-600 mt-1">plus an exclusive item on us for a limited time</span>
                  </h2>
                  <img
                    src={SoulDelightBox}
                    alt="Soul Delight Box"
                    className="w-full max-w-[200px] md:max-w-[260px] lg:max-w-[300px] mx-auto object-contain"
                  />
                  <p className="text-base md:text-lg text-gray-700">
                    Let's get you your exclusive set.
                  </p>
                  <Button
                    className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-10 py-2.5 text-base md:text-lg font-medium"
                    onClick={() => setCurrentStep('bonusForm')}
                  >
                    Continue to Claim
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:contents">
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
          </div>
        </div>
      )}

      {currentStep === 'bonusForm' && userCountry === 'US' && (
        <div className="flex flex-col lg:flex-row min-h-screen">
          <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
            <div className="max-w-xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Let's get you your exclusive set</h2>
              </div>

              <form onSubmit={handleBonusSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-x-4">
                  <div className="space-y-2 md:col-span-2">
                    {renderFormInput(
                      'Amazon Order Number',
                      'amazonOrder',
                      <ShoppingBag size={20} />,
                      'text',
                      () => formData.amazonOrder && validateOrderId(formData.amazonOrder)
                    )}
                  </div>

                  <div className="space-y-2">
                    {renderFormInput('First Name', 'firstName', <User size={20} />)}
                  </div>

                  <div className="space-y-2">
                    {renderFormInput('Last Name', 'lastName', <User size={20} />)}
                  </div>

                  <div className="space-y-2">
                    {renderSelectInput(
                      'Select Language',
                      'language',
                      <Globe size={20} />,
                      languageOptions,
                      () =>
                        validateField('language', formData.language, z.string().min(1, 'Please select a language'))
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Please select which PDF version you would like to receive - English or Spanish
                    </p>
                  </div>

                  <div className="space-y-2">
                    {renderFormInput(
                      'Email Address',
                      'email',
                      <Mail size={20} />,
                      'email',
                      () =>
                        validateField('email', formData.email, z.string().email('Please enter a valid email address'))
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    {renderFormInput('Street Address', 'address.street', <MapPin size={20} />)}
                  </div>

                  <div className="space-y-2">
                    {renderFormInput(
                      'City',
                      'address.city',
                      <MapPin size={20} />,
                      'text',
                      () =>
                        validateField('address.city', formData.address?.city, z.string().min(1, 'City is required'))
                    )}
                  </div>

                  <div className="space-y-2">
                    {renderFormInput(
                      'State/Province',
                      'address.state',
                      <MapPin size={20} />,
                      'text',
                      () =>
                        validateField(
                          'address.state',
                          formData.address?.state,
                          z.string().min(1, 'State/Province is required')
                        )
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative w-full">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Globe size={20} />
                      </div>
                      <div className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                        United States 🇺🇸
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">The flashcard bonus ships to USA addresses only.</p>
                  </div>

                  <div className="space-y-2">
                    {renderFormInput(
                      'Zip Code',
                      'address.zipCode',
                      <MapPin size={20} />,
                      'text',
                      () => {
                        const usZipRegex = /^\d{5}(-\d{4})?$/;
                        validateField(
                          'address.zipCode',
                          formData.address?.zipCode,
                          z
                            .string()
                            .refine(
                              (value) => usZipRegex.test(value || ''),
                              'Please enter a valid US Zip Code (e.g., 12345 or 12345-6789).'
                            )
                        );
                      }
                    )}
                  </div>

                  <div className="space-y-2">
                    {renderFormInput(
                      'Phone Number',
                      'phoneNumber',
                      <User size={20} />,
                      'tel',
                      () =>
                        validateField(
                          'phoneNumber',
                          formData.phoneNumber,
                          z
                            .string()
                            .regex(
                              phoneRegexFormatted,
                              'Please enter a valid phone number (e.g., (123) 456-7890)'
                            )
                        ),
                      handlePhoneNumberChange
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-red-500 text-sm text-center mt-4">{errorMessage}</p>
                )}

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                  >
                    Submit Claim
                  </Button>

                  <Button
                    type="button"
                    className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                    onClick={() => setCurrentStep('landing')}
                  >
                    Go Back
                  </Button>
                </div>
              </form>
            </div>
          </div>
          <ImageSection image1={Image1} image2={Image2} image3={Image3} />
        </div>
      )}

      {currentStep === 'bonusThankYou' && (
        <div className="flex flex-col lg:flex-row min-h-screen">
          <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center items-center">
            <div className="max-w-xl mx-auto space-y-8 text-center">
              <div className="mx-auto w-20 h-20 bg-[#ff5733] rounded-full flex items-center justify-center">
                <Package className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold">Your Bonus Is On The Way!</h2>

              <p className="text-gray-600">
                Thanks {formData.firstName || ''}! Your flashcard set will ship soon — keep an eye on your inbox.
              </p>

              <div className="space-y-4">
                <Button
                  className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                  onClick={() => setCurrentStep('landing')}
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
          <ImageSection image1={Image1} image2={Image2} image3={Image3} />
        </div>
      )}
    </div>
  );
}
