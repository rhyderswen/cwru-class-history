import { CourseProps } from "#/libs/xlsx";
import { useDisclosure } from "@mantine/hooks";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface SearchPageContextValue {
  courseFloatingOpened: boolean;
  openCourseFloating: () => void;
  closeCourseFloating: () => void;
  selectedCourse: CourseProps | null;
  setSelectedCourse: (course: CourseProps) => void;
  collapseAllSignal: number;
  collapseAll: () => void;
}

const SearchPageContext = createContext<SearchPageContextValue | null>(null);

export function SearchPageProvider({ children }: { children: ReactNode }) {
  const [selectedCourse, setSelectedCourseState] = useState<CourseProps | null>(null);
  const [courseFloatingOpened, { open: openCourseFloating, close: closeCourseFloating }] =
    useDisclosure(false);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);

  const setSelectedCourse = useCallback((value: CourseProps) => {
    setSelectedCourseState(value);
    openCourseFloating();
  }, []);

  const collapseAll = useCallback(() => {
    setCollapseAllSignal((c) => c + 1);
  }, []);

  const value = useMemo(
    () => ({
      selectedCourse,
      setSelectedCourse,
      courseFloatingOpened,
      openCourseFloating,
      closeCourseFloating,
      collapseAllSignal,
      collapseAll,
    }),
    [
      selectedCourse,
      setSelectedCourse,
      courseFloatingOpened,
      openCourseFloating,
      closeCourseFloating,
      collapseAllSignal,
      collapseAll,
    ],
  );

  return <SearchPageContext.Provider value={value}>{children}</SearchPageContext.Provider>;
}

export function useSearchPage() {
  const ctx = useContext(SearchPageContext);
  if (!ctx) throw new Error("useSearchPage must be used within SearchPageProvider");
  return ctx;
}
