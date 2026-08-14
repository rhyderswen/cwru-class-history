import { CourseProps } from "#/libs/xlsx";
import { useDisclosure } from "@mantine/hooks";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface SearchPageContextValue {
  courseFloatingOpened: boolean;
  openCourseFloating: () => void;
  closeCourseFloating: () => void;
  selectedCourse: CourseProps | null;
  setSelectedCourse: (course: CourseProps) => void;
}

const SearchPageContext = createContext<SearchPageContextValue | null>(null);

export function SearchPageProvider({ children }: { children: ReactNode }) {
  const [selectedCourse, setSelectedCourseState] = useState<CourseProps | null>(null);
  const [courseFloatingOpened, { open: openCourseFloating, close: closeCourseFloating }] =
    useDisclosure(false);

  const setSelectedCourse = useCallback((value: CourseProps) => {
    setSelectedCourseState(value);
    openCourseFloating();
  }, []);

  return (
    <SearchPageContext.Provider
      value={{
        selectedCourse,
        setSelectedCourse,
        courseFloatingOpened,
        openCourseFloating,
        closeCourseFloating,
      }}
    >
      {children}
    </SearchPageContext.Provider>
  );
}

export function useSearchPage() {
  const ctx = useContext(SearchPageContext);
  if (!ctx) throw new Error("useSearchPage must be used within SearchPageProvider");
  return ctx;
}
