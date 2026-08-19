import { ConflictingCourse } from "#/libs/xlsx";
import { useSearchPage } from "@/contexts/searchPageContext";
import { getColoredNumber, getCourseCodeColor, shortenedDaysToColors } from "@/libs/color";
import {
  CloseButton,
  DataList,
  Divider,
  FloatingWindow,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { SetFloatingWindowPosition, useViewportSize } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import CourseBadge from "./CourseBadge";

function CourseFloating() {
  const { selectedCourse, courseFloatingOpened, closeCourseFloating } = useSearchPage();
  const { width } = useViewportSize();
  const setPositionRef = useRef<SetFloatingWindowPosition | null>(null);

  const {
    data: conflicts,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["conflictsWithinDepartment", selectedCourse?.term, selectedCourse?.courseNumber],
    queryFn: async () => {
      const res = await fetch(
        `/api/conflictsWithinDepartment/${selectedCourse?.term}/${selectedCourse?.catalogNumber.slice(0, 4)}/${selectedCourse?.catalogNumber.slice(5)}/${selectedCourse?.days} ${selectedCourse?.time}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{
        fullConflicts: ConflictingCourse[];
        partialConflicts: ConflictingCourse[];
      }>;
    },
    enabled: courseFloatingOpened && !!selectedCourse?.days && !!selectedCourse?.time,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const listData = [
    {
      label: "Instructor",
      value: selectedCourse?.instructor,
    },
    {
      label: "Room",
      value: selectedCourse?.room,
    },
    {
      label: "Type",
      value: selectedCourse?.component,
    },
    {
      label: "Enrollment",
      value: (
        <>
          {selectedCourse?.enrollmentCap !== undefined &&
            selectedCourse?.enrollmentTotal !== undefined && (
              <>
                {getColoredNumber(selectedCourse?.enrollmentCap - selectedCourse?.enrollmentTotal)}/
                {selectedCourse?.enrollmentCap} open
              </>
            )}
        </>
      ),
    },
    {
      label: "Section Num.",
      value: selectedCourse?.sectionNumber,
    },
    {
      label: "Course Num.",
      value: selectedCourse?.courseNumber,
    },
  ];

  return (
    <Transition
      mounted={!!selectedCourse && courseFloatingOpened}
      transition="pop"
      duration={200}
      timingFunction="ease"
    >
      {(styles) => (
        <FloatingWindow
          style={styles}
          setPositionRef={setPositionRef}
          dragHandleSelector=".drag"
          initialPosition={{ top: 100, left: width < 850 ? 10 : (width - 850) / 2 + 825 }} // (width - 850) / 2 is width of left gap, 850 is width of dropdowns
          maw={300}
        >
          <Paper shadow="md" p="md">
            <Group justify="space-between" mb="xs" className="drag">
              <Stack gap={4} miw={0} flex="1">
                <Text
                  fw={500}
                  className="monospace"
                  lh={1}
                  c={getCourseCodeColor(selectedCourse?.catalogNumber || "")}
                >
                  {selectedCourse?.catalogNumber}
                </Text>
                <Text size="sm" lh={1} c="gray">
                  {selectedCourse?.title}
                </Text>
              </Stack>
              <CloseButton onClick={closeCourseFloating} />
            </Group>
            <Divider />
            <Text my="xs" lh={1}>
              {selectedCourse?.term}
            </Text>
            <DataList gap="xs" my="xs">
              {listData.map((item) => (
                <>
                  {item.value && (
                    <DataList.Item key={item.label}>
                      <DataList.ItemLabel>{item.label}</DataList.ItemLabel>
                      <DataList.ItemValue>{item.value}</DataList.ItemValue>
                    </DataList.Item>
                  )}
                </>
              ))}
            </DataList>
            {selectedCourse?.days && (
              <>
                <Divider my="xs" />
                {shortenedDaysToColors(selectedCourse?.days || "")}
                {selectedCourse?.time && (
                  <>
                    <Text>{selectedCourse?.time}</Text>
                    {isLoading ?
                      <Group mt={4} gap={6}>
                        <Text>Conflicts:</Text>
                        <Loader color="blue" size="sm" />
                      </Group>
                    : <>
                        {((conflicts?.fullConflicts?.length ?? 0) > 0 ||
                          (conflicts?.partialConflicts?.length ?? 0) > 0) && (
                          <>
                            <Text mt={4}>Conflicts:</Text>
                            <Paper shadow="none" p="xs" bg="var(--mantine-color-gray-0)" withBorder>
                              <Group gap="0 4px">
                                {conflicts?.fullConflicts.map((c, index) => (
                                  <CourseBadge
                                    key={index}
                                    courseCode={c.courseCode}
                                    displayStr={
                                      c.multipleComponents ?
                                        `${c.courseCode} (${c.component})`
                                      : undefined
                                    }
                                    color="red.7"
                                  />
                                ))}
                                {conflicts?.partialConflicts.map((c, index) => (
                                  <CourseBadge
                                    key={index}
                                    courseCode={c.courseCode}
                                    displayStr={
                                      c.multipleComponents ?
                                        `${c.courseCode} (${c.component})`
                                      : undefined
                                    }
                                    color="gray"
                                  />
                                ))}
                              </Group>
                            </Paper>
                          </>
                        )}
                      </>
                    }
                  </>
                )}
              </>
            )}
          </Paper>
        </FloatingWindow>
      )}
    </Transition>
  );
}

export default CourseFloating;
