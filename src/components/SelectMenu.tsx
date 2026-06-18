"use client";

import * as Select from "@radix-ui/react-select";
import React, { useState } from "react";

interface SelectMenuProps {
  items: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  nothingFound?: string;
  disabled?: boolean;
}

export default function SelectMenu({
  items,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search",
  nothingFound = "Nothing found.",
  disabled = false,
}: SelectMenuProps) {
  const [searchResults, setSearchResults] = useState(items);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const results = items.filter((item) =>
      item.label.toLocaleLowerCase().includes(val.toLocaleLowerCase())
    );
    setTimeout(() => setSearchResults(results), 100);
  };

  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      onOpenChange={() => setSearchResults(items)}
    >
      <Select.Trigger
        disabled={disabled}
        className="w-full inline-flex items-center justify-between px-3 py-2 text-sm text-gray-600 bg-white border rounded-lg shadow-sm outline-none focus:ring-offset-2 focus:ring-[#4F46BA] focus:ring-2 data-[placeholder]:text-gray-400"
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          avoidCollisions={false}
          className="w-[var(--radix-select-trigger-width)] overflow-hidden mt-3 bg-white border rounded-lg shadow-sm text-sm z-50"
        >
          <div className="shadow flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="p-2 text-gray-500 w-full rounded-md outline-none"
              onChange={handleSearch}
            />
          </div>
          <Select.Viewport className="max-h-64 mt-2 overflow-y-auto">
            {searchResults.length < 1 ? (
              <div className="px-3 py-2 text-gray-600">{nothingFound}</div>
            ) : null}
            {searchResults.map((item, idx) => (
              <SelectItem key={idx} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; value: string; className?: string }
>(({ children, ...props }, forwardedRef) => {
  return (
    <Select.Item
      className="flex items-center justify-between px-3 cursor-default py-2 duration-150 text-gray-600 data-[state=checked]:text-[#4F46BA] data-[state=checked]:bg-indigo-50 data-[highlighted]:text-[#4F46BA] data-[highlighted]:bg-indigo-50 outline-none"
      {...props}
      ref={forwardedRef}
    >
      <Select.ItemText>
        <div className="pr-4 line-clamp-1">{children}</div>
      </Select.ItemText>
      <div className="w-6">
        <Select.ItemIndicator>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#4F46BA]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </Select.ItemIndicator>
      </div>
    </Select.Item>
  );
});
