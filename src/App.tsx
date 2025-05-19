"use client"

import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { create } from 'zustand';
import * as z from 'zod';
import { Button } from "./components/ui/button";
import { Mail, User, Globe, Package, MapPin, ShoppingBag, Book, Upload, Loader2 } from 'lucide-react';
import { ImageSection } from './components/ImageSection';
import Booklet from "./assets/booklet.png"
import Intro from "./assets/studykey_box.png"
import Image1 from "./assets/intro_1.jpeg"
import Image2 from "./assets/intro_2.jpeg"
import Image3 from "./assets/intro_3.jpeg"

// Add this near the top of the file, after the imports
const phoneRegexFormatted = /^\(\d{3}\) \d{3}-\d{4}$/;

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
    firstName?: string;
    lastName?: string;
    language?: string;
    set?: string;
    asin?: string;
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
  screenshotUrl: string | null;
  setScreenshotUrl: (url: string | null) => void;
  uploadProgress: { isUploading: boolean; progress: number };
  setUploadProgress: (progress: Partial<AppStore['uploadProgress']>) => void;
  screenshotFile: File | null;
  setScreenshotFile: (file: File | null) => void;
  reviewScreenshotUrl: string | null;
  setReviewScreenshotUrl: (url: string | null) => void;
  reviewScreenshotFile: File | null;
  setReviewScreenshotFile: (file: File | null) => void;
}

const useAppStore = create<AppStore>((set) => ({
  selectedOption: null,
  setSelectedOption: (option: 'pdf' | 'bonus') => set({ selectedOption: option }),
  formData: {
    address: {}
  },
  setFormData: (data: Partial<AppStore['formData']>) => set((state) => ({ formData: { ...state.formData, ...data } })),
  setAddressFormData: (data: Partial<AppStore['formData']['address']>) => set((state) => ({ formData: { ...state.formData, address: { ...state.formData.address, ...data } } })),
  screenshotUrl: null,
  setScreenshotUrl: (url) => set({ screenshotUrl: url }),
  uploadProgress: { isUploading: false, progress: 0 },
  setUploadProgress: (progress: Partial<AppStore['uploadProgress']>) => set((state) => ({ uploadProgress: { ...state.uploadProgress, ...progress } })),
  screenshotFile: null,
  setScreenshotFile: (file: File | null) => set({ screenshotFile: file }),
  reviewScreenshotUrl: null,
  setReviewScreenshotUrl: (url) => set({ reviewScreenshotUrl: url }),
  reviewScreenshotFile: null,
  setReviewScreenshotFile: (file: File | null) => set({ reviewScreenshotFile: file }),
}));

const queryClient = new QueryClient();

export default function App() {
  const [currentStep, setCurrentStep] = useState<'intro' | 'pdfForm' | 'pdfThankYou' | 'bonusForm' | 'reviewForm' | 'bonusThankYou'>('intro');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ isValid: boolean; asin?: string } | null>(null);
  const { selectedOption, setSelectedOption, formData, setFormData, setAddressFormData, screenshotUrl, setScreenshotUrl, uploadProgress, screenshotFile, setScreenshotFile, setUploadProgress, reviewScreenshotUrl, setReviewScreenshotUrl, reviewScreenshotFile, setReviewScreenshotFile } = useAppStore();
  const [isValidating, setIsValidating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Effect to clear errors when step changes
  useEffect(() => {
    setErrorMessage(null);
    setFieldErrors({});
    // Decide if you want to reset order ID validation status on step change
    // setValidationStatus(null);
    // Reset screenshot state when leaving bonus form
    if (currentStep !== 'bonusForm') {
       setScreenshotFile(null);
       setScreenshotUrl(null);
       setUploadProgress({ isUploading: false, progress: 0 });
    }
  }, [currentStep, setScreenshotFile, setScreenshotUrl, setUploadProgress]); // Add dependencies

  const API_BASE_URL = 'https://studykey-riddles-server.vercel.app/';

  const validateOrderId = async (orderId: string) => {
    if (!orderId) {
      setValidationStatus(null);
      setFieldErrors(prev => { // Also clear field error for amazonOrder
          const newState = { ...prev };
          delete newState.amazonOrder;
          return newState;
      });
      return;
    }
    setIsValidating(true);
    // Clear previous validation specific messages/errors
    setValidationStatus(null);
    setFieldErrors(prev => {
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
        setValidationStatus({ isValid: true, asin: data.asin || '' });
        if (data.asin) {
          const reviewLink = `https://www.amazon.com/review/create-review?asin=${data.asin}`;
          setFormData({ reviewLink, asin: data.asin });
        }
         // Clear amazonOrder field error if validation succeeds
         setFieldErrors(prev => {
            const newState = { ...prev };
            delete newState.amazonOrder;
            return newState;
         });
      } else {
        setValidationStatus({ isValid: false });
        // Set amazonOrder field error for invalid ID
        setFieldErrors(prev => ({ ...prev, amazonOrder: 'Invalid order ID. Please check and try again.' }));
      }
    } catch (error) {
      console.error(error);
      setValidationStatus({ isValid: false });
       // Set amazonOrder field error for API error
      setFieldErrors(prev => ({ ...prev, amazonOrder: 'Error validating order ID. Please try again.' }));
    } finally {
      setIsValidating(false);
    }
  };


  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); // Clear any previous error messages for this form submission attempt

    const schema = z.object({
      email: z.string().email("Please enter a valid email address"),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      language: z.string().min(1, "Please select a PDF language")
    });

    try {
      schema.parse(formData);

      const response = await fetch(`${API_BASE_URL}/submit-review`,{
        method:"POST",
        headers: { 'Content-Type': 'application/json' },
        body:JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          language: formData.language,
          email: formData.email,
          type: 'pdf' // Add type to distinguish from bonus submission
        })
      });

      if (!response.ok) {
        if (response.status == 409) {
          throw new Error('Already Claimed with this email, please try bonus set');
        }
        throw new Error('Failed to submit PDF request. Please try again.');
      }

      console.log('PDF submission successful');
      // Only navigate to thank you page if submission was successful
      setCurrentStep('pdfThankYou');

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        const firstError = error.errors[0];
        setErrorMessage(firstError.message);
      } else if (error instanceof Error) {
        // Handle fetch or other general errors
        setErrorMessage(error.message);
      } else {
        // Catch any other unexpected errors
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      console.error("Submission error:", error);
    }
  };

   // Individual field validation function (generic helper)
  const validateField = <T extends keyof AppStore['formData'] | `address.${keyof AppStore['formData']['address']}`>(
      name: T,
      value: any,
      schema: z.ZodSchema<any>
  ) => {
      try {
          // Validate using the provided Zod schema
          schema.parse(value);

          // Clear the specific field error if it now passes validation
          if (fieldErrors[name]) {
              setFieldErrors(prev => {
                  const newState = { ...prev };
                  delete newState[name];
                  return newState;
              });
          }
      } catch (error) {
          if (error instanceof z.ZodError) {
              // Set the specific field error
              setFieldErrors(prev => ({ ...prev, [name]: error.errors[0].message }));
          } else {
             // Handle unexpected errors during validation itself (less common)
             console.error(`Error validating field ${name}:`, error);
             setErrorMessage(`Error validating ${name}.`);
          }
      }
  };

  // Moved the core upload logic into a separate function
  const uploadScreenshot = async (file: File): Promise<string> => {
       const formData = new FormData();
       formData.append('screenshot', file);

       return new Promise((resolve, reject) => {
           const xhr = new XMLHttpRequest();
           xhr.open('POST', `${API_BASE_URL}/upload-screenshot`, true);

           xhr.upload.onprogress = (event) => {
             if (event.lengthComputable) {
               const progress = Math.round((event.loaded * 100) / event.total);
               setUploadProgress({ isUploading: true, progress });
             }
           };

           xhr.onload = () => {
             if (xhr.status === 200) {
               const response = JSON.parse(xhr.responseText);
               if (response.success && response.url) {
                 setUploadProgress({ isUploading: false, progress: 100 });
                 resolve(response.url); // Resolve the promise with the URL
               } else {
                 setUploadProgress({ isUploading: false, progress: 0 });
                 const errorMessage = response.message || 'Upload failed';
                 reject(new Error(errorMessage)); // Reject on backend failure
               }
             } else {
                setUploadProgress({ isUploading: false, progress: 0 });
                const errorResponse = JSON.parse(xhr.responseText || '{}');
                const errorMessage = errorResponse.message || 'Upload failed';
                reject(new Error(errorMessage)); // Reject on non-200 status
             }
           };

           xhr.onerror = () => {
             setUploadProgress({ isUploading: false, progress: 0 });
             reject(new Error('Upload failed. Network error.')); // Reject on network error
           };

           xhr.send(formData);
       });
  };


  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // Check if we have a valid review link
      if (!formData.reviewLink || !formData.asin) {
        setErrorMessage('Please validate your order ID to get the review link.');
        return;
      }

      let finalReviewScreenshotUrl = reviewScreenshotUrl;

      // Upload review screenshot if needed
      if (reviewScreenshotFile && !reviewScreenshotUrl) {
        try {
          finalReviewScreenshotUrl = await uploadScreenshot(reviewScreenshotFile);
          setReviewScreenshotUrl(finalReviewScreenshotUrl);
        } catch (uploadError) {
          console.error("Review screenshot upload error:", uploadError);
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Failed to upload review screenshot.';
          setFieldErrors(prev => ({ ...prev, reviewScreenshot: errorMsg }));
          setErrorMessage('Review screenshot upload failed. Please try again.');
          return;
        }
      }

      // Check if review screenshot is available
      if (!finalReviewScreenshotUrl) {
        setErrorMessage('Please upload your review screenshot.');
        return;
      }

      // Construct the final payload
      const bonusPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        language: formData.language,
        email: formData.email,
        orderId: formData.amazonOrder,
        address: formData.address,
        productSet: formData.set,
        phoneNumber: formData.phoneNumber,
        reviewScreenshotUrl: finalReviewScreenshotUrl,
      };

      // Submit the form
      const response = await fetch(`${API_BASE_URL}/bonus-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bonusPayload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to submit form.' }));
        throw new Error(errorBody.message || 'Failed to submit form. Please try again.');
      }

      setCurrentStep('bonusThankYou');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
        setFieldErrors(errors);
         setErrorMessage('Please fix the errors above before submitting.'); // Add general message for Zod errors
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      console.error("Submission error:", error);
    }
  };

  // Adjusted renderFormInput to improve error message styling and add input type
  const renderFormInput = (
    placeholder: string,
    name: keyof AppStore['formData'] | `address.${keyof AppStore['formData']['address']}`,
    icon: React.ReactNode,
    type: string = 'text',
    onBlur?: () => void,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => {
    const getValue = (path: string) => {
      const keys = path.split('.');
      let value: any = formData;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return '';
        }
      }
      return value;
    };

    const setValue = (path: string, value: any) => {
      const keys = path.split('.');
      if (keys[0] === 'address') {
        setAddressFormData({ [keys[1]]: value });
      } else {
        setFormData({ [keys[0]]: value });
      }
    };

    const error = fieldErrors[name];
    const value = getValue(name);

    // Determine right padding based on whether inline status/spinner is shown
    const prClass = (name === 'amazonOrder' && (isValidating || validationStatus)) ? 'pr-10' : 'pr-4';

    return (
      <div className="relative w-full"> {/* Outer container */}
        <div className="relative"> {/* Inner container for input, icon, and inline status */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
            <input
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={onChange ? onChange : (e) => {
                setValue(name, e.target.value);
                {/* Clear field error when user starts typing, but not for amazonOrder if validating/validated */}
                if (name !== 'amazonOrder' && fieldErrors[name]) {
                  setFieldErrors(prev => {
                     const newState = { ...prev };
                     delete newState[name];
                     return newState;
                  });
                }
              }}
              onBlur={onBlur}
              // Adjust padding-right dynamically
              className={`w-full pl-10 ${prClass} py-2 border ${
                error ? 'border-red-500' : 'border-gray-200'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent`}
            />
            {/* Inline spinner and status for Amazon Order Number ONLY, positioned inside the inner relative div */}
            {name === 'amazonOrder' && isValidating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#ff5733] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
             {name === 'amazonOrder' && validationStatus?.isValid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                ✓
              </div>
            )}
            {name === 'amazonOrder' && validationStatus?.isValid === false && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                ✗
              </div>
            )}
        </div>

        {/* Display field-specific error below the outer container */}
        {error && (
           <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>
    );
  };

  // New renderSelectInput function for dropdowns
   interface SelectOption {
       value: string;
       label: string;
   }

   const renderSelectInput = (
       placeholder: string,
       name: keyof AppStore['formData'] | `address.${keyof AppStore['formData']['address']}`,
       icon: React.ReactNode,
       options: SelectOption[],
       onBlur?: () => void
   ) => {
       const getValue = (path: string) => {
           const keys = path.split('.');
           let value: any = formData;
           for (const key of keys) {
               if (value && typeof value === 'object' && key in value) {
                   value = value[key];
               } else {
                   return '';
               }
           }
           return value;
       };

       const setValue = (path: string, value: any) => {
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
            <div className="relative w-full"> {/* Outer container */}
                <div className="relative"> {/* Inner container for select, icon, and arrow */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {icon}
                    </div>
                    <select
                        value={value}
                        onChange={(e) => {
                            setValue(name, e.target.value);
                             if (fieldErrors[name]) {
                                setFieldErrors(prev => {
                                    const newState = { ...prev };
                                    delete newState[name];
                                    return newState;
                                });
                            }
                        }}
                        onBlur={onBlur}
                        className={`w-full pl-10 pr-8 py-2 border ${ /* Increased pr for dropdown arrow */
                            error ? 'border-red-500' : 'border-gray-200'
                        } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5733] focus:border-transparent appearance-none bg-white`} 
                    >
                        <option value="" disabled>{placeholder}</option> 
                        {options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                 {/* Display field-specific error below the outer container */}
                 {error && (
                   <p className="text-red-500 text-sm mt-1">{error}</p>
                )}
            </div>
       );
   };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    let formattedValue = '';

    // Apply formatting (###) ###-####
    if (value.length > 0) {
      formattedValue = '(' + value.substring(0, 3);
      if (value.length >= 4) {
        formattedValue += ') ' + value.substring(3, Math.min(6, value.length));
        if (value.length >= 7) {
          formattedValue += '-' + value.substring(6, Math.min(10, value.length));
        }
      }
    }

    // Limit to 14 characters including formatting: (###) ###-####
    if (formattedValue.length > 14) {
        formattedValue = formattedValue.substring(0, 14);
    }

    setFormData({ phoneNumber: formattedValue });

    // Clear phone number field error immediately on typing
     if (fieldErrors.phoneNumber) {
        setFieldErrors(prev => {
            const newState = { ...prev };
            delete newState.phoneNumber;
            return newState;
        });
     }
  };

  // Define country options for the dropdown
  const countryOptions = [
      { value: '', label: 'Select Country' }, // Added empty option as placeholder
      { value: 'US', label: 'USA 🇺🇸' },
      { value: 'CA', label: 'Canada 🇨🇦' },
      // Add other countries if needed in the future
  ];

  // Update the language options to use lowercase values
  const languageOptions = [
    { value: '', label: 'Select Language' },
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Spanish' },
  ];

  const FileUploadWithProgress = () => {
    const {
      uploadProgress, // Need uploadProgress here to show the progress bar
      screenshotFile, // Still need screenshotFile to hold the selected file temporarily
      setScreenshotFile,
      screenshotUrl, // Need screenshotUrl here to show success/uploaded state
    } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Clear previous upload status/errors when selecting a new file
      setUploadProgress({ isUploading: false, progress: 0 });
      setScreenshotUrl(null); // Clear previously uploaded URL
       setFieldErrors(prev => { // Clear screenshot error
            const newState = { ...prev };
            delete newState.screenshot;
            return newState;
        });

      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please upload an image file');
          setScreenshotFile(null); // Clear the selected file state
          if (fileInputRef.current) { fileInputRef.current.value = ''; } // Reset input
          return;
        }
        // Validate file size (e.g., 5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size should be less than 5MB');
           setScreenshotFile(null); // Clear the selected file state
           if (fileInputRef.current) { fileInputRef.current.value = ''; } // Reset input
          return;
        }
        // If validation passes, set the file in state - DO NOT start upload here
        setScreenshotFile(file);
      } else {
          // If file selection is cancelled, clear the state
          setScreenshotFile(null);
      }
    };

    return (
      <div className="space-y-4 py-2">
        <div className="  ">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="screenshot-upload"
          />
          <label
            htmlFor="screenshot-upload"
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer ${
               uploadProgress.isUploading ? 'bg-gray-100 text-gray-500 cursor-not-allowed' // Dim and disable while uploading (though button handles primary disable)
               : fieldErrors.screenshot ? 'border-red-500 text-red-500' // Style error state
               : screenshotUrl ? 'border-green-500 text-green-700' // Style success state
               : 'border-gray-300 hover:bg-gray-50 text-gray-700' // Default state
             }`}
             // Label is not truly disabled, but cursor indicates state
          >
            {uploadProgress.isUploading ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
             ) : screenshotUrl ? (
                 // Optionally show a success icon if URL exists
                 <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
             ) : (
                <Upload className="w-5 h-5" />
             )}
            <span>
                {uploadProgress.isUploading ? 'Uploading...'
                 : screenshotUrl ? 'Screenshot Uploaded' // Text after successful upload
                 : screenshotFile ? 'File Selected (Ready to Upload)' // Text after selecting but before uploading
                 : 'Choose Screenshot' // Initial text
                }
            </span>
          </label>
          {/* Removed the explicit Upload Button */}
        </div>

        {/* Show selected file name if a file is chosen but not yet uploaded */}
        {screenshotFile && !uploadProgress.isUploading && !screenshotUrl && (
           <div className="text-sm text-gray-600">
            Selected file: {screenshotFile.name}
          </div>
        )}

         {/* Show selected file name after upload success */}
         {screenshotFile && !uploadProgress.isUploading && screenshotUrl && (
             <div className="text-sm text-gray-600">
               File: {screenshotFile.name}
             </div>
         )}


        {/* Progress bar */}
        {uploadProgress.isUploading && uploadProgress.progress > 0 && ( // Only show if uploading and progress has started
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"> {/* Added margin-top for spacing */}
            <div
              className="bg-[#ff5733] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
        )}

        {/* Success message - Now the label text also indicates success */}
        {/* Removed explicit success message div as label text now covers it */}

         {/* Field error for screenshot */}
         {fieldErrors.screenshot && (
           <p className="text-red-500 text-sm mt-1">{fieldErrors.screenshot}</p>
        )}
      </div>
    );
  };

  // Add new component for review screenshot upload
  const ReviewScreenshotUpload = () => {
    const {
      uploadProgress,
      reviewScreenshotFile,
      setReviewScreenshotFile,
      reviewScreenshotUrl,
      setReviewScreenshotUrl,
      setUploadProgress,
    } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setUploadProgress({ isUploading: false, progress: 0 });
      setReviewScreenshotUrl(null);
      setFieldErrors(prev => {
        const newState = { ...prev };
        delete newState.reviewScreenshot;
        return newState;
      });

      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Please upload an image file');
          setReviewScreenshotFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert('File size should be less than 5MB');
          setReviewScreenshotFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        setReviewScreenshotFile(file);
      } else {
        setReviewScreenshotFile(null);
      }
    };

    return (
      <div className="space-y-4 py-2">
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="review-screenshot-upload"
          />
          <label
            htmlFor="review-screenshot-upload"
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer ${
              uploadProgress.isUploading ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : fieldErrors.reviewScreenshot ? 'border-red-500 text-red-500'
              : reviewScreenshotUrl ? 'border-green-500 text-green-700'
              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {uploadProgress.isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : reviewScreenshotUrl ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span>
              {uploadProgress.isUploading ? 'Uploading...'
               : reviewScreenshotUrl ? 'Review Screenshot Uploaded'
               : reviewScreenshotFile ? 'File Selected (Ready to Upload)'
               : 'Upload Review Screenshot'
              }
            </span>
          </label>
        </div>

        {reviewScreenshotFile && !uploadProgress.isUploading && !reviewScreenshotUrl && (
          <div className="text-sm text-gray-600">
            Selected file: {reviewScreenshotFile.name}
          </div>
        )}

        {reviewScreenshotFile && !uploadProgress.isUploading && reviewScreenshotUrl && (
          <div className="text-sm text-gray-600">
            File: {reviewScreenshotFile.name}
          </div>
        )}

        {uploadProgress.isUploading && uploadProgress.progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div
              className="bg-[#ff5733] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
        )}

        {fieldErrors.reviewScreenshot && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.reviewScreenshot}</p>
        )}
      </div>
    );
  };


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
                    <h2 className="text-lg font-semibold text-center">Option 1: I want the FREE E-BOOK only</h2>
                    <p className="text-gray-700 text-center">A fast boost for your Spanish practice</p>
                  </div>

                  <div className="h-full w-96 mx-auto">
                    <img
                      src={Booklet}
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
                    <h2 className="text-lg font-semibold text-center">Option 2: I want the PDF + FREE Flashcard Set!</h2>
                    <p className="text-gray-700 text-center">A great mixture of fun and learning</p>
                  </div>

                  <div className="h-32 w-96 flex mx-auto">
                  <img
                      src={Booklet}
                      alt="Spanish Flashcard Set"
                      className="w-full h-full object-contain bg-transparent"
                    />
                    <img
                      src={Intro}
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
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
          </div>
        )}

        {currentStep === 'pdfForm' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
              <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Get Your Free PDF</h2>
                  <p className="text-gray-600">Yay! You chose the free PDF! We're excited to send it your way - all we need is the best email to send it to.</p>
                </div>

                <form onSubmit={handlePdfSubmit} className="space-y-6">
                  <div className="space-y-2">
                    {renderFormInput("First Name", "firstName", <User size={20} />)}
                    {fieldErrors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {renderFormInput("Last Name", "lastName", <User size={20} />)}
                    {fieldErrors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {renderSelectInput(
                      "Select PDF Language",
                      "language",
                      <Globe size={20} />,
                      languageOptions,
                      () => validateField('language', formData.language, z.string().min(1, "Please select a PDF language"))
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Please select which PDF version you would like to receive - English or Spanish
                    </p>
                    {fieldErrors.language && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.language}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {renderFormInput("Email Address", "email", <Mail size={20} />, "email")}
                    {fieldErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {errorMessage && (
                    <p className="text-red-500 text-sm">{errorMessage}</p>
                  )}

                  <div className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                      disabled={Object.keys(fieldErrors).length > 0}
                    >
                      Send Me the PDF
                    </Button>

                    <Button
                      type="button"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                      onClick={() => { setSelectedOption('bonus'); setCurrentStep('bonusForm'); }}
                    >
                      Get Bonus Flashcard Set
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
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-x-4">
                    {/* Amazon Order Number */}
                    <div className="space-y-2 md:col-span-2">
                      {renderFormInput(
                        "Amazon Order Number",
                        "amazonOrder",
                        <ShoppingBag size={20} />,
                        "text",
                        () => formData.amazonOrder && validateOrderId(formData.amazonOrder)
                      )}
                    </div>

                    {/* First Name */}
                    <div className="space-y-2">
                      {renderFormInput("First Name", "firstName", <User size={20} />)}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                      {renderFormInput("Last Name", "lastName", <User size={20} />)}
                    </div>

                    {/* Language Dropdown and Email in the same row */}
                    <div className="space-y-2">
                      {renderSelectInput(
                        "Select Language",
                        "language",
                        <Globe size={20} />,
                        languageOptions,
                        () => validateField('language', formData.language, z.string().min(1, "Please select a language"))
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Please select your preferred language for the bonus set
                      </p>
                      {fieldErrors.language && (
                        <p className="text-red-500 text-sm mt-1">{fieldErrors.language}</p>
                      )}
                    </div>

                    {/* Email field beside language dropdown */}
                    <div className="space-y-2">
                      {renderFormInput(
                        "Email Address",
                        "email",
                        <Mail size={20} />,
                        "email",
                        () => validateField('email', formData.email, z.string().email("Please enter a valid email address"))
                      )}
                      {fieldErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                      )}
                    </div>

                    {/* Street Address */}
                    <div className="space-y-2 md:col-span-2">
                      {renderFormInput("Street Address", "address.street", <MapPin size={20} />)}
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      {renderFormInput(
                        "City",
                        "address.city",
                        <MapPin size={20} />,
                        "text",
                         () => validateField('address.city', formData.address?.city, z.string().min(1, "City is required"))
                      )}
                    </div>

                    {/* State/Province */}
                    <div className="space-y-2">
                      {renderFormInput(
                         "State/Province",
                         "address.state",
                         <MapPin size={20} />,
                         "text",
                          () => validateField('address.state', formData.address?.state, z.string().min(1, "State/Province is required"))
                        )}
                    </div>

                    {/* Country (Dropdown) */}
                    <div className="space-y-2">
                       {renderSelectInput(
                           "Select Country",
                           "address.country",
                           <Globe size={20} />,
                           countryOptions,
                           () => validateField('address.country', formData.address?.country, z.string().min(1, "Country is required"))
                       )}
                    </div>

                    {/* Zip/Postal Code */}
                     <div className="space-y-2">
                      {renderFormInput(
                        "Zip/Postal Code",
                        "address.zipCode",
                        <MapPin size={20} />,
                        "text",
                         () => {
                             const usZipRegex = /^\d{5}(-\d{4})?$/;
                             const caPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

                             validateField('address.zipCode', formData.address?.zipCode,
                                z.string().refine(value => {
                                if (formData.address?.country === 'US') {
                                    return usZipRegex.test(value || '');
                                }
                                if (formData.address?.country === 'CA') {
                                     const cleanedValue = value?.replace(/[- ]/g, '') || '';
                                     return caPostalCodeRegex.test(cleanedValue);
                                }
                                return (value || '').length > 0;
                                }, "Invalid Zip/Postal Code for selected country.")
                             );

                             if (formData.address?.country === 'US' || formData.address?.country === 'CA') {
                                 validateField('address.state', formData.address?.state, z.string().min(1, "State/Province is required"));
                             }
                         }
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      {renderFormInput(
                        "Phone Number",
                        "phoneNumber",
                        <User size={20} />,
                        "tel",
                        () => validateField('phoneNumber', formData.phoneNumber, z.string().regex(phoneRegexFormatted, "Please enter a valid phone number (e.g., (123) 456-7890)"))
                        ,
                        handlePhoneNumberChange
                      )}
                    </div>

                  </div>

                  {errorMessage && (
                    <p className="text-red-500 text-sm text-center mt-4">{errorMessage}</p>
                  )}

                  <div className="space-y-4">
                    <Button
                      type="button"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                      onClick={() => setCurrentStep('reviewForm')}
                      disabled={
                        isValidating || 
                        Object.keys(fieldErrors).length > 0 || 
                        !validationStatus?.isValid ||
                        !formData.firstName?.trim() ||
                        !formData.lastName?.trim() ||
                        !formData.language?.trim() ||
                        !formData.email?.trim() ||
                        !formData.address?.street?.trim() ||
                        !formData.address?.city?.trim() ||
                        !formData.address?.state?.trim() ||
                        !formData.address?.country?.trim() ||
                        !formData.address?.zipCode?.trim() ||
                        !formData.phoneNumber?.trim()
                      }
                    >
                      Next Step
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
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
          </div>
        )}

        {currentStep === 'pdfThankYou' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center items-center">
              <div className="max-w-xl mx-auto space-y-8 text-center">
                <div className="mx-auto w-20 h-20 bg-[#ff5733] rounded-full flex items-center justify-center">
                  <Mail className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold">
                  Check Your Inbox!
                </h2>

                <div className="space-y-4 text-gray-600">
                  <p className="text-lg font-semibold">THANK YOU {formData.firstName || 'NAME'}, YOUR STUDY KEY PDF IS ON ITS WAY!</p>
                  <p className="text-lg font-semibold">THANK YOU {formData.name || 'NAME'}, YOUR STUDY KEY PDF IS ON ITS WAY!</p>
                  <p>CHECK YOUR INBOX FOR THE DOWNLOADABLE LINK - AND GET READY TO POWER UP YOUR LANGUAGE SKILLS.</p>
                  <p className="font-semibold">DIDN'T RECEIVE IT?</p>
                  <p>CHECK YOUR SPAM/JUNK FOLDER.</p>
                  <p>WANT TO GO FURTHER? YOU CAN STILL REQUEST THE FULL BONUS SET BELOW!</p>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                    onClick={() => { setSelectedOption('bonus'); setCurrentStep('bonusForm'); }}
                  >
                    Get Bonus Flashcard Set
                  </Button>

                  <Button
                    className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                    onClick={() => setCurrentStep('intro')}
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            </div>
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
          </div>
        )}

        {currentStep === 'reviewForm' && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
              <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Leave a Review</h2>
                  <p className="text-gray-600">Help others discover our product by leaving a review on Amazon</p>
                </div>

                <form onSubmit={handleBonusSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {/* Review Link - Keep this first */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Review Link</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Click the link below to leave your review on Amazon:
                      </p>
                      <a
                        href={formData.reviewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#ff5733] hover:underline"
                      >
                        {formData.reviewLink}
                      </a>
                    </div>

                    {/* Review Screenshot Upload - Move this second */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Your Review Screenshot
                      </label>
                      <p className="text-sm text-gray-500 mb-2">
                        Please take a screenshot of your Amazon review and upload it here
                      </p>
                      <ReviewScreenshotUpload />
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-red-500 text-sm text-center mt-4">{errorMessage}</p>
                  )}

                  <div className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                      disabled={uploadProgress.isUploading || (!reviewScreenshotFile && !reviewScreenshotUrl)}
                    >
                      Claim My Bonus Set
                    </Button>

                    <Button
                      type="button"
                      className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                      onClick={() => setCurrentStep('bonusForm')}
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

                <h2 className="text-2xl font-bold">
                  Your Gifts Are On The Way!
                </h2>

                <p className="text-gray-600">Check your email for the PDF and expect your flashcard set soon!</p>

                <div className="space-y-4">
                  <Button
                    className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                    onClick={() => { setSelectedOption('bonus'); setCurrentStep('bonusForm'); }}
                  >
                    Get Bonus Flashcard Set
                  </Button>

                  <Button
                    className="w-full rounded-full bg-transparent hover:bg-gray-100 text-gray-700 py-2 text-lg font-medium border border-gray-300"
                    onClick={() => setCurrentStep('intro')}
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
    </QueryClientProvider>
  );
}