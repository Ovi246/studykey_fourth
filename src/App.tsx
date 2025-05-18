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
}));

const queryClient = new QueryClient();

export default function App() {
  const [currentStep, setCurrentStep] = useState<'intro' | 'pdfForm' | 'pdfThankYou' | 'bonusForm' | 'bonusThankYou'>('intro');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ isValid: boolean; asin?: string } | null>(null);
  const { selectedOption, setSelectedOption, formData, setFormData, setAddressFormData, screenshotUrl, setScreenshotUrl, uploadProgress, screenshotFile, setScreenshotFile, setUploadProgress } = useAppStore();
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
      name: z.string().min(1, "Name is required"),
      language: z.string().min(1, "Language is required")
    });

    try {
      schema.parse(formData);

      const response = await fetch(`${API_BASE_URL}/submit-review`,{
        method:"POST",
        headers: { 'Content-Type': 'application/json' },
        body:JSON.stringify({
          name: formData.name,
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
    // DO NOT clear fieldErrors here. We want to show errors from onBlur validation.
    // setFieldErrors({});

    // Regex for US (5 digits, optional +4) and Canadian (A1A A1A) zip/postal codes
    const usZipRegex = /^\d{5}(-\d{4})?$/;
    const caPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

    // Regex for US (###) ###-#### and Canadian (###) ###-#### phone numbers
    const phoneRegexFormatted = /^\(\d{3}\)\s\d{3}-\d{4}$/;

    const schema = z.object({
      amazonOrder: z.string().min(1, "Amazon Order Number is required"),
      name: z.string().min(1, "Name is required"),
      language: z.string().min(1, "Language is required"),
      set: z.string().min(1, "Set is required"),
      email: z.string().email("Please enter a valid email address"),
      phoneNumber: z.string().regex(phoneRegexFormatted, "Please enter a valid phone number (e.g., (123) 456-7890)"),
      address: z.object({
        street: z.string().min(1, "Street Address is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State/Province is required"),
        country: z.string().min(1, "Country is required"), // Country is required for zip validation
        zipCode: z.string().refine(value => {
          // This refine handles validation on submit based on the CURRENT country value in formData
          if (formData.address?.country === 'US') {
            return usZipRegex.test(value || '');
          }
          if (formData.address?.country === 'CA') {
             const cleanedValue = value?.replace(/[- ]/g, '') || '';
             return caPostalCodeRegex.test(cleanedValue);
          }
          // If country is not US/CA, just check if zip code is not empty
          return (value || '').length > 0;
        }, "Please enter a valid Zip/Postal Code for the selected country."),
      })
    });

    try {
      // Run full form validation on submit
      schema.parse(formData);

      // Also check if there are any errors from onBlur validations
       if (Object.keys(fieldErrors).length > 0) {
           setErrorMessage('Please fix the errors above before submitting.');
           return; // Prevent submission if there are existing field errors
       }

      // After Zod validation and fieldError check pass, check Order ID validation status
      if (!validationStatus?.isValid) {
         // Set a specific field error for amazonOrder if it wasn't validated
         setFieldErrors(prev => ({ ...prev, amazonOrder: 'Please validate your Amazon order ID first.' }));
         return; // Prevent submission
      }

      let finalScreenshotUrl = screenshotUrl; // Start with the existing URL if already uploaded

      // If a new file is selected and not yet uploaded, trigger the upload
      if (screenshotFile && !screenshotUrl) {
          setErrorMessage(null); // Clear general error before upload
          setFieldErrors(prev => { // Clear screenshot error before upload
             const newState = { ...prev };
             delete newState.screenshot;
             return newState;
         });
          try {
              // Upload the screenshot and get the URL
              finalScreenshotUrl = await uploadScreenshot(screenshotFile);
              setScreenshotUrl(finalScreenshotUrl); // Update store with the new URL
          } catch (uploadError) {
              console.error("Screenshot upload error during submit:", uploadError);
              const errorMsg = uploadError instanceof Error ? uploadError.message : 'Failed to upload screenshot. Please try again.';
               setFieldErrors(prev => ({ ...prev, screenshot: errorMsg }));
              setErrorMessage('Screenshot upload failed. Please fix the error and try again.'); // Set general error message
               setScreenshotFile(null); // Clear file on upload error during submit
               if (document.getElementById('screenshot-upload')) { // Reset the file input element
                  (document.getElementById('screenshot-upload') as HTMLInputElement).value = '';
               }
              return; // Stop submission if upload fails
          }
      } else if (!screenshotUrl) {
          // If no file selected and no URL exists, show error
           setFieldErrors(prev => ({ ...prev, screenshot: 'Please upload a screenshot of your order' }));
           setErrorMessage('Please upload a screenshot before submitting.');
           return;
      }


      // If we reach here, all validations passed, order ID is validated, and screenshotUrl is available
      // Construct the payload matching the Bonus object structure
      const bonusPayload = {
        name: formData.name,
        language: formData.language,
        email: formData.email,
        orderId: formData.amazonOrder, // Map amazonOrder to orderId
        address: formData.address,
        productSet: formData.set, // Map set to productSet
        phoneNumber: formData.phoneNumber,
        screenshotUrl: finalScreenshotUrl, // Use the obtained URL
        // createdAt will be set on the backend
      };

      // Perform the main form submission
      const response = await fetch(`${API_BASE_URL}/bonus-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bonusPayload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to submit form.' }));
        throw new Error(errorBody.message || 'Failed to submit form. Please try again.');
      }

      console.log('Bonus submission successful');
      setCurrentStep('bonusThankYou'); // Navigate on success

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
                  <p className="text-gray-600">Yay! You chose the free PDF! We're excited to send it your way - all we need is the best email to send it to. </p>
                </div>

                <form onSubmit={handlePdfSubmit} className="space-y-6">
                  <div className="space-y-2">
                    {renderFormInput("Your Name", "name", <User size={20} />)}
                     {fieldErrors.name && (
                       <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
                     )}
                  </div>
                   <div className="space-y-2">
                     {renderFormInput("Language", "language", <Globe size={20} />)}
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
                        // onBlur for Order ID validation
                        () => formData.amazonOrder && validateOrderId(formData.amazonOrder)
                      )}
                       {/* Field error for amazonOrder is displayed by renderFormInput */}
                       {/* Spinner/Check/X are also inline now */}
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      {renderFormInput("Your Name", "name", <User size={20} />)}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      {renderFormInput("Language", "language", <Globe size={20} />)}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Street Address */}
                    <div className="space-y-2 md:col-span-2">
                      {renderFormInput("Street Address", "address.street", <MapPin size={20} />)}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      {renderFormInput(
                        "City",
                        "address.city",
                        <MapPin size={20} />,
                        "text",
                         // onBlur validation for City
                        () => validateField('address.city', formData.address?.city, z.string().min(1, "City is required"))
                      )}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* State/Province */}
                    <div className="space-y-2">
                      {renderFormInput(
                         "State/Province",
                         "address.state",
                         <MapPin size={20} />,
                         "text",
                          // onBlur validation for State/Province
                         () => validateField('address.state', formData.address?.state, z.string().min(1, "State/Province is required"))
                       )}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Country (Dropdown) */}
                    <div className="space-y-2">
                       {renderSelectInput(
                           "Select Country", // Placeholder for dropdown
                           "address.country",
                           <Globe size={20} />,
                           countryOptions,
                           // Optional: onBlur validation for Country (checking if selected)
                           () => validateField('address.country', formData.address?.country, z.string().min(1, "Country is required"))
                       )}
                       {/* Field error is displayed by renderSelectInput */}
                    </div>

                    {/* Zip/Postal Code */}
                     <div className="space-y-2">
                      {renderFormInput(
                        "Zip/Postal Code",
                        "address.zipCode",
                        <MapPin size={20} />,
                        "text",
                         // onBlur validation for Zip/Postal Code
                         () => {
                             const usZipRegex = /^\d{5}(-\d{4})?$/;
                             const caPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

                             validateField('address.zipCode', formData.address?.zipCode,
                                z.string().refine(value => {
                                // Use the *current* country value from formData for validation
                                if (formData.address?.country === 'US') {
                                    return usZipRegex.test(value || '');
                                }
                                if (formData.address?.country === 'CA') {
                                     const cleanedValue = value?.replace(/[- ]/g, '') || '';
                                     return caPostalCodeRegex.test(cleanedValue);
                                }
                                // If country is not US/CA or not selected, still require a non-empty value
                                return (value || '').length > 0;
                                }, "Invalid Zip/Postal Code for selected country.") // More specific message
                             );

                             // Re-validate State if Zip Code validation happens on blur and country is US/CA
                             // This ensures consistency if country changes
                             if (formData.address?.country === 'US' || formData.address?.country === 'CA') {
                                 validateField('address.state', formData.address?.state, z.string().min(1, "State/Province is required"));
                             }
                         }
                      )}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      {renderFormInput(
                        "Phone Number",
                        "phoneNumber",
                        <User size={20} />, // Or a phone icon if available
                        "tel",
                        // onBlur validation for Phone Number
                        () => validateField('phoneNumber', formData.phoneNumber, z.string().regex(phoneRegexFormatted, "Please enter a valid phone number (e.g., (123) 456-7890)"))
                        ,
                        handlePhoneNumberChange // Custom onChange for formatting
                      )}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Email Address */}
                    <div className="space-y-2">
                       {renderFormInput("Email Address", "email", <Mail size={20} />, "email")}
                        {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Set */}
                    <div className="space-y-2 md:col-span-2">
                      {renderFormInput("Set", "set", <Package size={20} />)}
                       {/* Field error is displayed by renderFormInput */}
                    </div>

                    {/* Screenshot Upload */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Order Screenshot
                      </label>
                      <FileUploadWithProgress />
                       {/* Field error for screenshot is displayed by FileUploadWithProgress */}
                    </div>

                  </div> {/* End of two-column grid */}

                   {/* General error message for submission issues not tied to a specific field */}
                  {errorMessage && (
                    <p className="text-red-500 text-sm text-center mt-4">{errorMessage}</p>
                  )}

                  <div className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white py-2 text-lg font-medium"
                       // Disable button if currently validating, has ANY field errors, is uploading, OR screenshotFile/screenshotUrl is NOT available
                      disabled={isValidating || Object.keys(fieldErrors).length > 0 || uploadProgress.isUploading || (!screenshotFile && !screenshotUrl)}
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
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
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

                {currentStep === 'pdfThankYou' ? (
                  <div className="space-y-4 text-gray-600">
                    <p className="text-lg font-semibold">THANK YOU {formData.name || 'NAME'}, YOUR STUDY KEY PDF IS ON ITS WAY!</p>
                    <p>CHECK YOUR INBOX FOR THE DOWNLOADABLE LINK - AND GET READY TO POWER UP YOUR LANGUAGE SKILLS.</p>
                    <p className="font-semibold">DIDN'T RECEIVE IT?</p>
                    <p>CHECK YOUR SPAM/JUNK FOLDER.</p>
                    <p>WANT TO GO FURTHER? YOU CAN STILL REQUEST THE FULL BONUS SET BELOW!</p>
                  </div>
                ) : (
                  <p className="text-gray-600">Check your email for the PDF and expect your flashcard set soon!</p>
                )}

                <div className="space-y-4">
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
            <ImageSection image1={Image1} image2={Image2} image3={Image3} />
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}