
import React from 'react';
import { Property } from '../../types';

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  id?: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick, id }) => {
  return (
    <article
      id={id}
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card-light dark:bg-card-dark shadow-ethereal transition-all hover:shadow-floating hover:-translate-y-1 duration-300 cursor-pointer border border-gray-100 dark:border-gray-800"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
        <img
          alt={property.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={property.imageUrl}
        />
      </div>

      <div className="flex flex-col p-5">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-xl font-bold leading-tight text-brand-black dark:text-white group-hover:text-primary transition-colors">{property.name}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-text-sub-light dark:text-text-sub-dark mb-4 font-body">
          <span className="material-symbols-outlined text-[18px] text-brand-orange">location_on</span>
          <p className="text-sm font-medium">{property.address}</p>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px] font-variation-settings-fill">kitchen</span>
            </span>
            <span className="font-body text-xs font-bold text-primary">{property.applianceCount} Smart Devices</span>
          </div>
          <button className="h-9 w-9 rounded-full bg-background-light dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default PropertyCard;
