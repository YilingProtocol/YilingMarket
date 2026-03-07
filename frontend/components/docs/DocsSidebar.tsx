"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { List, X, ChevronRight } from "lucide-react";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface TocSection {
  heading: TocItem;
  children: TocItem[];
}

interface DocsSidebarProps {
  headings: TocItem[];
}

function groupHeadings(headings: TocItem[]): TocSection[] {
  const sections: TocSection[] = [];
  let current: TocSection | null = null;

  for (const h of headings) {
    if (h.level === 2) {
      current = { heading: h, children: [] };
      sections.push(current);
    } else if (h.level === 3 && current) {
      current.children.push(h);
    }
  }

  return sections;
}

export function DocsSidebar({ headings }: DocsSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sections = useMemo(() => groupHeadings(headings), [headings]);

  // Auto-expand section containing the active heading
  useEffect(() => {
    if (!activeId) return;
    for (const section of sections) {
      const ids = [section.heading.id, ...section.children.map((c) => c.id)];
      if (ids.includes(activeId)) {
        setExpanded((prev) => {
          if (prev.has(section.heading.id)) return prev;
          const next = new Set(prev);
          next.add(section.heading.id);
          return next;
        });
        break;
      }
    }
  }, [activeId, sections]);

  // Scroll-spy with IntersectionObserver
  useEffect(() => {
    const ids = headings.map((h) => h.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      setIsOpen(false);
    }
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const tocList = (
    <nav>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      <div className="space-y-0.5">
        {sections.map((section) => {
          const isExpanded = expanded.has(section.heading.id);
          const hasChildren = section.children.length > 0;
          const isActive = activeId === section.heading.id;
          const childActive = section.children.some((c) => c.id === activeId);

          return (
            <div key={section.heading.id}>
              {/* h2 accordion trigger */}
              <div className="flex items-center">
                {hasChildren && (
                  <button
                    onClick={() => toggleSection(section.heading.id)}
                    className="size-5 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronRight
                      className={`size-3.5 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (hasChildren) toggleSection(section.heading.id);
                    scrollTo(section.heading.id);
                  }}
                  className={`flex-1 text-left text-sm py-1.5 transition-colors cursor-pointer ${
                    !hasChildren ? "pl-5" : "pl-0.5"
                  } ${
                    isActive || childActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {section.heading.text}
                </button>
              </div>

              {/* h3 children (accordion content) */}
              {hasChildren && (
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {section.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => scrollTo(child.id)}
                      className={`block w-full text-left text-[13px] py-1 pl-9 transition-colors cursor-pointer ${
                        activeId === child.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground/80 hover:text-foreground"
                      }`}
                    >
                      {child.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop: Sticky sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 pb-8">
          {tocList}
        </div>
      </aside>

      {/* Mobile: FAB + Drawer */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 size-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Table of contents"
      >
        <List className="size-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 z-50 h-full w-72 bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Contents</span>
          <button
            onClick={() => setIsOpen(false)}
            className="size-8 rounded-md flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close table of contents"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-3.5rem)]">
          {tocList}
        </div>
      </div>
    </>
  );
}
