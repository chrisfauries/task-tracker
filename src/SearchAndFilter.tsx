import { useState, useRef, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { searchQueryAtom, selectedCategoriesAtom, categoriesAtom } from "./atoms";

export function SearchAndFilter() {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const [selectedCats, setSelectedCats] = useAtom(selectedCategoriesAtom);
  const categories = useAtomValue(categoriesAtom);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCategory = (catName: string) => {
    if (selectedCats.includes(catName)) {
      setSelectedCats(selectedCats.filter((c) => c !== catName));
    } else {
      setSelectedCats([...selectedCats, catName]);
    }
  };

  const activeFiltersCount = selectedCats.length;

  return (
    <div className="flex items-center gap-2 mr-3 px-2 border-r border-slate-200 h-8">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-2 py-1 w-28 focus:w-48 transition-all duration-300 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            title="Clear search"
            className="absolute inset-y-0 right-1 flex items-center text-slate-400 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${
            activeFiltersCount > 0 || isFilterOpen
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-transparent"
          }`}
          title="Filter by category"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {activeFiltersCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {isFilterOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => setSelectedCats([])}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {Object.keys(categories).length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 italic">
                  No categories defined
                </div>
              ) : (
                Object.values(categories).map((cat) => (
                  <label
                    key={cat.name}
                    className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 rounded cursor-pointer select-none text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      checked={selectedCats.includes(cat.name)}
                      onChange={() => toggleCategory(cat.name)}
                    />
                    <span className="truncate flex-1">{cat.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
