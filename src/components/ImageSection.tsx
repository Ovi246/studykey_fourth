import React from 'react';

export function ImageSection({ image1, image2, image3 }) {
  return (
    <div className="w-full lg:w-1/2 relative">
      <div className="h-full w-full relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[90%] h-[60%] top-[5%] right-[5%] transform -rotate-6">
            <div className="w-full h-full overflow-hidden rounded-[50%] border-4 border-white shadow-lg">
              <img
                src={image1}
                alt="Spanish learning - Beach scene"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="absolute w-[70%] h-[50%] top-[40%] right-[0%] transform rotate-[100deg]">
            <div className="w-full h-full overflow-hidden rounded-[50%] border-4 border-white shadow-lg">
              <img
                src={image2}
                alt="Spanish learning - Study group"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="absolute w-[60%] h-[40%] bottom-[10%] left-[-7%] transform rotate-[80deg]">
            <div className="w-full h-full overflow-hidden rounded-[50%] border-4 border-white shadow-lg">
              <img
                src={image3}
                alt="Spanish learning - Materials"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 