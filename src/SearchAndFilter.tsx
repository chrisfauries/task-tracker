import { useState, useRef, useEffect, useMemo } from "react";
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

  // Sort categories by order property
  const sortedCategories = useMemo(() => {
    return Object.values(categories).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const activeFiltersCount = selectedCats.length;

  return (
    <div className="flex items-center gap-2 mr-3 px-2 border-r border-slate-200 h-8">
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
          🔍
        </span>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-3 py-1 bg-slate-100 border-none rounded-lg text-sm w-48 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400 font-medium"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`p-1.5 rounded-lg transition-colors relative ${
            isFilterOpen || activeFiltersCount > 0
              ? "bg-indigo-50 text-indigo-600"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
          title="Filter by category"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border-2 border-white">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {isFilterOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categories</span>
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
              {sortedCategories.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 italic">
                  No categories defined
                </div>
              ) : (
                sortedCategories.map((cat) => (
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