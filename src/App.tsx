"use client"

import React from 'react';
import { ImageSection } from './components/ImageSection';
import Booklet from "./assets/booklet.png"
import Image1 from "./assets/intro_1.jpeg"
import Image2 from "./assets/intro_2.jpeg"
import Image3 from "./assets/intro_3.jpeg"

// PDF download links — replace the # placeholders with real URLs when ready
const PDF_LINK_ENGLISH = 'https://go.studykey.ca/english-pdf';
const PDF_LINK_SPANISH = 'https://go.studykey.ca/spanish-pdf';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-[#e0f2fe]">
      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* Left half — content */}
        <div className="w-full lg:w-1/2 p-6 lg:p-12 flex flex-col justify-center items-center">
          <div className="max-w-xl mx-auto space-y-4">

            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-center">
              Thank you for your purchase! Here is your additional learning material to help you learn faster!
            </h1>

            {/* Subtitle */}
            <div className="space-y-1 text-center">
              <h2 className="text-lg font-semibold">Get your eBook</h2>
            </div>

            {/* Booklet image */}
            <div className="w-72 mx-auto">
              <img
                src={Booklet}
                alt="Spanish E-Books"
                className="w-full h-52 object-contain"
              />
            </div>

            {/* Two PDF download buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-600 text-center">Si estás aprendiendo inglés, descarga este enlace.</p>
                <a
                  href={PDF_LINK_ENGLISH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-8 py-3 text-lg font-medium text-center transition-colors duration-200"
                >
                  📘 English PDF
                </a>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-600 text-center">If you're learning Spanish, download this link.</p>
                <a
                  href={PDF_LINK_SPANISH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#ff5733] hover:bg-[#e64a2e] text-white px-8 py-3 text-lg font-medium text-center transition-colors duration-200"
                >
                  📗 Spanish PDF
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Right half — images */}
        <ImageSection image1={Image1} image2={Image2} image3={Image3} />

      </div>
    </div>
  );
}